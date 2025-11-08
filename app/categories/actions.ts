"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import {
	categoryFormSchema,
	subcategoryFormSchema,
	type CategoryFormValues,
	type SubcategoryFormValues,
} from "@/lib/schemas";
import {
	createSupabaseAdminClient,
	MissingEnvironmentVariableError,
} from "@/lib/supabase-admin";
const optionalNumericIdSchema = z
	.union([z.string(), z.number(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === null || value === undefined) {
			return null;
		}

		if (typeof value === "number") {
			return Number.isInteger(value) && value > 0 ? value : NaN;
		}

		const trimmed = String(value).trim();
		if (!trimmed) {
			return null;
		}

		const parsed = Number(trimmed);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
	});

const optionalCategoryIdSchema = optionalNumericIdSchema.refine(
	(value) => value === null || (Number.isInteger(value) && value > 0),
	{ message: "Selecciona una categoría válida" },
);

const optionalSubcategoryIdSchema = optionalNumericIdSchema.refine(
	(value) => value === null || (Number.isInteger(value) && value > 0),
	{ message: "Selecciona una subcategoría válida" },
);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenErrors(error: z.ZodError): ActionErrorRecord {
	const { fieldErrors, formErrors } = error.flatten();
	return {
		...(Object.fromEntries(
			Object.entries(fieldErrors).map(([key, value]) => [key, value ?? []]),
		) as ActionErrorRecord),
		...(formErrors.length ? { form: formErrors } : {}),
	};
}

export async function createCategoryAction(
	formData: FormData,
): Promise<ActionResult<{ category: CategoryFormValues & { id: number } }>> {
	try {
		const payload = categoryFormSchema.parse({
			name: formData.get("name"),
		});

		const adminClient = createSupabaseAdminClient();

		const { data, error } = await adminClient
			.from("categories")
			.upsert({ name: payload.name }, { onConflict: "name" })
			.select("id, name")
			.single();

		if (error || !data) {
			throw new Error(error?.message ?? "No pudimos guardar la categoría");
		}

		revalidatePath("/categories");

		return {
			success: true,
			data: { category: { id: data.id, name: data.name ?? payload.name } },
			message: "Categoría lista",
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

		console.error("[createCategoryAction]", error);
		return {
			success: false,
			errors: {
				form: [
					"No pudimos guardar la categoría. Intenta de nuevo o verifica los datos ingresados.",
				],
			},
		};
	}
}

export async function createSubcategoryAction(formData: FormData): Promise<
	ActionResult<{
		subcategory: SubcategoryFormValues & { id: number };
	}>
> {
	try {
		const payload = subcategoryFormSchema.parse({
			categoryId: formData.get("categoryId"),
			name: formData.get("name"),
		});

		const adminClient = createSupabaseAdminClient();

		const { data: category, error: fetchCategoryError } = await adminClient
			.from("categories")
			.select("id")
			.eq("id", payload.categoryId)
			.maybeSingle();

		if (fetchCategoryError) {
			throw new Error(fetchCategoryError.message);
		}

		if (!category) {
			return {
				success: false,
				errors: {
					categoryId: ["Selecciona una categoría válida"],
				},
			};
		}

		const { data, error } = await adminClient
			.from("subcategories")
			.upsert(
				{
					category_id: payload.categoryId,
					name: payload.name,
				},
				{ onConflict: "category_id,name" },
			)
			.select("id, name, category_id")
			.single();

		if (error || !data) {
			throw new Error(error?.message ?? "No pudimos guardar la subcategoría");
		}

		revalidatePath("/categories");

		return {
			success: true,
			data: {
				subcategory: {
					id: data.id,
					name: data.name ?? payload.name,
					categoryId: data.category_id ?? payload.categoryId,
				},
			},
			message: "Subcategoría creada",
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

		console.error("[createSubcategoryAction]", error);
		return {
			success: false,
			errors: {
				form: [
					"No pudimos guardar la subcategoría. Intenta de nuevo o verifica los datos ingresados.",
				],
			},
		};
	}
}

const updateProductClassificationSchema = z.object({
	productId: z
		.string({ required_error: "Selecciona un producto válido" })
		.uuid("Producto inválido"),
	categoryId: optionalCategoryIdSchema,
	subcategoryId: optionalSubcategoryIdSchema,
});

export async function updateProductClassificationAction(
	formData: FormData,
): Promise<
	ActionResult<{
		id: string;
		categoryId: number | null;
		subcategoryId: number | null;
	}>
> {
	try {
		const payload = updateProductClassificationSchema.parse({
			productId: formData.get("productId"),
			categoryId: formData.get("categoryId"),
			subcategoryId: formData.get("subcategoryId"),
		});

		const adminClient = createSupabaseAdminClient();

		const { data: product, error: fetchProductError } = await adminClient
			.from("products")
			.select("id, meta")
			.eq("id", payload.productId)
			.maybeSingle();

		if (fetchProductError) {
			throw new Error(fetchProductError.message);
		}

		if (!product) {
			return {
				success: false,
				errors: {
					form: ["No encontramos el producto. Intenta recargar la página."],
				},
			};
		}

		let resolvedCategoryId = payload.categoryId;
		const resolvedSubcategoryId = payload.subcategoryId;
		let subcategoryName: string | null = null;

		if (resolvedSubcategoryId !== null) {
			const { data: subcategory, error: fetchSubcategoryError } =
				await adminClient
					.from("subcategories")
					.select("id, category_id, name")
					.eq("id", resolvedSubcategoryId)
					.maybeSingle();

			if (fetchSubcategoryError) {
				throw new Error(fetchSubcategoryError.message);
			}

			if (!subcategory) {
				return {
					success: false,
					errors: {
						subcategoryId: ["Selecciona una subcategoría válida"],
					},
				};
			}

			subcategoryName = subcategory.name ?? null;

			if (
				resolvedCategoryId !== null &&
				resolvedCategoryId !== (subcategory.category_id ?? null)
			) {
				return {
					success: false,
					errors: {
						categoryId: [
							"La categoría y subcategoría seleccionadas no coinciden.",
						],
						subcategoryId: [
							"Elige una subcategoría que pertenezca a la categoría seleccionada.",
						],
					},
				};
			}

			resolvedCategoryId = subcategory.category_id ?? resolvedCategoryId;
		}

		if (resolvedCategoryId !== null) {
			const { data: category, error: fetchCategoryError } = await adminClient
				.from("categories")
				.select("id")
				.eq("id", resolvedCategoryId)
				.maybeSingle();

			if (fetchCategoryError) {
				throw new Error(fetchCategoryError.message);
			}

			if (!category) {
				return {
					success: false,
					errors: {
						categoryId: ["Selecciona una categoría válida"],
					},
				};
			}
		}

		const meta = isRecord(product.meta) ? { ...product.meta } : {};
		if (subcategoryName) {
			meta.subcategory = subcategoryName;
		} else if ("subcategory" in meta) {
			delete meta.subcategory;
		}

		const { data: updated, error: updateError } = await adminClient
			.from("products")
			.update({
				category_id: resolvedCategoryId,
				subcategory_id: resolvedSubcategoryId,
				meta,
			})
			.eq("id", payload.productId)
			.select("id, category_id, subcategory_id")
			.single();

		if (updateError) {
			throw new Error(updateError.message);
		}

		revalidatePath("/categories/association");
		revalidatePath("/categories");
		revalidatePath("/inventory");

		return {
			success: true,
			data: {
				id: updated.id,
				categoryId: updated.category_id ?? null,
				subcategoryId: updated.subcategory_id ?? null,
			},
			message: "Clasificación actualizada",
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

		console.error("[updateProductClassificationAction]", error);
		return {
			success: false,
			errors: {
				form: [
					"No pudimos actualizar la clasificación del producto. Intenta nuevamente.",
				],
			},
		};
	}
}
