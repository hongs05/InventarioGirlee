"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionErrorRecord, ActionResult } from "@/lib/actions";
import { productFormSchema } from "@/lib/schemas";
import { deleteImageFromBucket, uploadImageToBucket } from "@/lib/storage";
import {
	createSupabaseAdminClient,
	MissingEnvironmentVariableError,
} from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function flattenErrors(error: z.ZodError): ActionErrorRecord {
	const { fieldErrors, formErrors } = error.flatten();
	return {
		...(Object.fromEntries(
			Object.entries(fieldErrors).map(([key, value]) => [key, value ?? []]),
		) as ActionErrorRecord),
		...(formErrors.length ? { form: formErrors } : {}),
	};
}

function parseProductForm(formData: FormData) {
	const imageEntry = formData.get("imageFile");

	const parsed = productFormSchema.safeParse({
		name: formData.get("name"),
		brand: formData.get("brand"),
		sku: formData.get("sku"),
		description: formData.get("description"),
		categoryId: formData.get("categoryId"),
		newCategoryName: formData.get("newCategoryName"),
		costPrice: formData.get("costPrice"),
		sellPrice: formData.get("sellPrice"),
		currency: formData.get("currency"),
		status: formData.get("status"),
		quantity: formData.get("quantity"),
		imageFile:
			imageEntry instanceof File && imageEntry.size > 0
				? imageEntry
				: undefined,
	});

	if (!parsed.success) {
		throw parsed.error;
	}

	return parsed.data;
}

type CreateProductPayload = {
	id: string;
	imageUrl?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildProductMeta(
	existingMeta: unknown,
	brand: ReturnType<typeof parseProductForm>["brand"],
) {
	const base = isRecord(existingMeta) ? { ...existingMeta } : {};

	if (brand) {
		base.brand = brand;
	} else if ("brand" in base) {
		delete base.brand;
	}

	return base;
}

async function ensureCategoryId(
	adminClient: ReturnType<typeof createSupabaseAdminClient>,
	categoryId: ReturnType<typeof parseProductForm>["categoryId"],
	newCategoryName: ReturnType<typeof parseProductForm>["newCategoryName"],
) {
	if (categoryId) {
		const numericId = Number(categoryId);
		if (Number.isFinite(numericId)) {
			return numericId;
		}
		throw new Error("Categoría seleccionada inválida");
	}

	if (!newCategoryName) {
		return null;
	}

	const trimmedName = newCategoryName.trim();
	if (!trimmedName) {
		return null;
	}

	const { data, error } = await adminClient
		.from("categories")
		.upsert({ name: trimmedName }, { onConflict: "name" })
		.select("id")
		.single();

	if (error) {
		throw new Error("No pudimos crear la categoría");
	}

	return data?.id ?? null;
}

export async function createProductAction(
	formData: FormData,
): Promise<ActionResult<CreateProductPayload>> {
	try {
		const payload = parseProductForm(formData);
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();

		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

		const categoryId = await ensureCategoryId(
			adminClient,
			payload.categoryId,
			payload.newCategoryName,
		);
		const quantityValue = Math.max(0, payload.quantity ?? 0);
		const submittedStatus = payload.status ?? "active";
		const resolvedStatus = quantityValue <= 0 ? "archived" : submittedStatus;

		let imageUrl: string | null = null;
		if (payload.imageFile instanceof File) {
			const upload = await uploadImageToBucket(
				adminClient,
				"products",
				payload.imageFile,
				payload.name,
			);
			imageUrl = upload.publicUrl;
		}

		const meta = buildProductMeta(null, payload.brand);
		const insertPayload: Record<string, unknown> = {
			name: payload.name,
			sku: payload.sku ?? null,
			description: payload.description ?? null,
			category_id: categoryId,
			cost_price: payload.costPrice,
			sell_price: payload.sellPrice ?? null,
			currency: payload.currency ?? "NIO",
			status: resolvedStatus,
			image_path: imageUrl,
			quantity: quantityValue,
			created_by: authData?.user?.id ?? null,
		};

		if (Object.keys(meta).length > 0) {
			insertPayload.meta = meta;
		}

		const { data, error } = await adminClient
			.from("products")
			.insert(insertPayload)
			.select("id")
			.single();

		if (error || !data) {
			throw new Error("No pudimos guardar el producto");
		}

		revalidatePath("/inventory");
		revalidatePath("/dashboard");

		return {
			success: true,
			data: { id: data.id, imageUrl },
			message: "Producto creado correctamente",
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, errors: flattenErrors(error) };
		}

		if (error instanceof MissingEnvironmentVariableError) {
			return {
				success: false,
				errors: {
					form: [
						`Falta configurar la variable de entorno ${error.envVar}. Revisa la guía de instalación para obtener el valor correcto.`,
					],
				},
			};
		}

		console.error("[createProductAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos guardar el producto"] },
		};
	}
}

export async function updateProductAction(formData: FormData): Promise<
	ActionResult<{
		payload: ReturnType<typeof parseProductForm> & { id: string };
	}>
> {
	try {
		const id = z
			.string({ required_error: "ID de producto inválido" })
			.uuid("ID de producto inválido")
			.parse(formData.get("id"));
		const payload = parseProductForm(formData);

		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();
		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

		const { data: existing, error: fetchError } = await adminClient
			.from("products")
			.select("image_path, created_by, meta")
			.eq("id", id)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		if (!existing) {
			return {
				success: false,
				errors: { form: ["Producto no encontrado."] },
			};
		}

		if (
			existing.created_by &&
			authData?.user?.id &&
			existing.created_by !== authData.user.id
		) {
			return {
				success: false,
				errors: { form: ["No tienes permisos para modificar este producto."] },
			};
		}

		const categoryId = await ensureCategoryId(
			adminClient,
			payload.categoryId,
			payload.newCategoryName,
		);
		const quantityValue = Math.max(0, payload.quantity ?? 0);
		const submittedStatus = payload.status ?? "active";
		const resolvedStatus = quantityValue <= 0 ? "archived" : submittedStatus;

		let imageUrl = existing.image_path ?? null;
		if (payload.imageFile instanceof File) {
			await deleteImageFromBucket(adminClient, "products", existing.image_path);
			const upload = await uploadImageToBucket(
				adminClient,
				"products",
				payload.imageFile,
				payload.name,
			);
			imageUrl = upload.publicUrl;
		}

		const meta = buildProductMeta(existing.meta, payload.brand);

		const { error: updateError } = await adminClient
			.from("products")
			.update({
				name: payload.name,
				sku: payload.sku ?? null,
				description: payload.description ?? null,
				category_id: categoryId,
				cost_price: payload.costPrice,
				sell_price: payload.sellPrice ?? null,
				currency: payload.currency ?? "NIO",
				status: resolvedStatus,
				image_path: imageUrl,
				quantity: quantityValue,
				meta,
			})
			.eq("id", id);

		if (updateError) {
			throw new Error(updateError.message);
		}

		revalidatePath("/inventory");
		revalidatePath("/dashboard");

		return {
			success: true,
			data: { payload: { id, ...payload } },
			message: "Producto actualizado correctamente",
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, errors: flattenErrors(error) };
		}

		if (error instanceof MissingEnvironmentVariableError) {
			return {
				success: false,
				errors: {
					form: [
						`Falta configurar la variable de entorno ${error.envVar}. Revisa la guía de instalación para obtener el valor correcto.`,
					],
				},
			};
		}

		console.error("[updateProductAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos actualizar el producto."] },
		};
	}
}

export async function archiveProductAction(
	productId: string,
): Promise<ActionResult<{ id: string }>> {
	if (!productId) {
		return { success: false, errors: { form: ["ID de producto inválido"] } };
	}

	try {
		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from("products")
			.update({ status: "archived" })
			.eq("id", productId);

		if (error) {
			throw new Error(error.message);
		}

		revalidatePath("/inventory");
		revalidatePath("/dashboard");

		return {
			success: true,
			data: { id: productId },
			message: "Producto archivado correctamente",
		};
	} catch (error) {
		if (error instanceof MissingEnvironmentVariableError) {
			return {
				success: false,
				errors: {
					form: [
						`Falta configurar la variable de entorno ${error.envVar}. Revisa la guía de instalación para obtener el valor correcto.`,
					],
				},
			};
		}

		console.error("[archiveProductAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos archivar el producto."] },
		};
	}
}

export async function activateProductAction(
	productId: string,
): Promise<ActionResult<{ id: string }>> {
	if (!productId) {
		return { success: false, errors: { form: ["ID de producto inválido"] } };
	}

	try {
		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from("products")
			.update({ status: "active" })
			.eq("id", productId);

		if (error) {
			throw new Error(error.message);
		}

		revalidatePath("/inventory");
		revalidatePath("/dashboard");

		return {
			success: true,
			data: { id: productId },
			message: "Producto activado correctamente",
		};
	} catch (error) {
		if (error instanceof MissingEnvironmentVariableError) {
			return {
				success: false,
				errors: {
					form: [
						`Falta configurar la variable de entorno ${error.envVar}. Revisa la guía de instalación para obtener el valor correcto.`,
					],
				},
			};
		}

		console.error("[activateProductAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos activar el producto."] },
		};
	}
}

export async function deleteProductAction(
	productId: string,
): Promise<ActionResult<{ id: string }>> {
	if (!productId) {
		return { success: false, errors: { form: ["ID de producto inválido"] } };
	}

	try {
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();
		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

		const { data: existing, error: fetchError } = await adminClient
			.from("products")
			.select("image_path, created_by")
			.eq("id", productId)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		if (!existing) {
			return {
				success: false,
				errors: { form: ["Producto no encontrado"] },
			};
		}

		if (
			existing.created_by &&
			authData?.user?.id &&
			existing.created_by !== authData.user.id
		) {
			return {
				success: false,
				errors: {
					form: ["No tienes permisos para eliminar este producto."],
				},
			};
		}

		const { error: deleteError } = await adminClient
			.from("products")
			.delete()
			.eq("id", productId);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		if (existing.image_path) {
			try {
				await deleteImageFromBucket(
					adminClient,
					"products",
					existing.image_path,
				);
			} catch (storageError) {
				console.error("[deleteProductAction:deleteImage]", storageError);
			}
		}

		revalidatePath("/inventory");

		return {
			success: true,
			data: { id: productId },
			message: "Producto eliminado definitivamente",
		};
	} catch (error) {
		if (error instanceof MissingEnvironmentVariableError) {
			return {
				success: false,
				errors: {
					form: [
						`Falta configurar la variable de entorno ${error.envVar}. Revisa la guía de instalación para obtener el valor correcto.`,
					],
				},
			};
		}

		console.error("[deleteProductAction]", error);
		return {
			success: false,
			errors: {
				form: ["No pudimos eliminar el producto."],
			},
		};
	}
}
