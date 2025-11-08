"use server";

import { z } from "zod";

import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import { comboFormSchema, ComboFormValues } from "@/lib/schemas";
import { deleteImageFromBucket, uploadImageToBucket } from "@/lib/storage";
import {
	createSupabaseAdminClient,
	MissingEnvironmentVariableError,
} from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function parseItemsField(
	value: FormDataEntryValue | null,
): ComboFormValues["items"] {
	if (!value) {
		return [];
	}

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				return parsed as ComboFormValues["items"];
			}
		} catch (error) {
			console.error("Invalid items payload", error);
		}
	}

	return [];
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

function parseComboForm(formData: FormData) {
	const itemsPayload = parseItemsField(formData.get("items"));
	const imageEntry = formData.get("imageFile");

	const parsed = comboFormSchema.safeParse({
		name: formData.get("name"),
		description: formData.get("description"),
		packagingCost: formData.get("packagingCost"),
		status: formData.get("status"),
		suggestedPrice: formData.get("suggestedPrice"),
		imageFile:
			imageEntry instanceof File && imageEntry.size > 0
				? imageEntry
				: undefined,
		items: itemsPayload,
	});

	if (!parsed.success) {
		throw parsed.error;
	}

	return parsed.data;
}

export async function createComboAction(
	formData: FormData,
): Promise<ActionResult<{ id: string }>> {
	try {
		const payload = parseComboForm(formData);
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();
		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

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

		const { data: combo, error } = await adminClient
			.from("combos")
			.insert({
				name: payload.name,
				description: payload.description ?? null,
				packaging_cost: Number(payload.packagingCost ?? 0),
				suggested_price: payload.suggestedPrice ?? null,
				status: payload.status,
				image_path: imageUrl,
				created_by: authData?.user?.id ?? null,
			})
			.select("id")
			.single();

		if (error || !combo) {
			throw new Error(error?.message ?? "No pudimos crear el combo");
		}

		if (payload.items.length) {
			const items = payload.items.map((item) => ({
				combo_id: combo.id,
				product_id: item.productId,
				qty: item.qty,
			}));

			const { error: itemsError } = await adminClient
				.from("combo_items")
				.insert(items);

			if (itemsError) {
				await adminClient.from("combos").delete().eq("id", combo.id);
				if (imageUrl) {
					await deleteImageFromBucket(adminClient, "products", imageUrl);
				}
				throw new Error(itemsError.message);
			}
		}

		return {
			success: true,
			data: { id: combo.id },
			message: "Combo creado correctamente",
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

		console.error("[createComboAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos crear el combo."] },
		};
	}
}

export async function updateComboAction(
	formData: FormData,
): Promise<
	ActionResult<{ payload: ReturnType<typeof parseComboForm> & { id: string } }>
> {
	try {
		const id = z
			.string({ required_error: "ID de combo inválido" })
			.uuid("ID de combo inválido")
			.parse(formData.get("id"));
		const payload = parseComboForm(formData);
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();
		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

		const { data: existing, error: fetchError } = await adminClient
			.from("combos")
			.select("image_path, created_by")
			.eq("id", id)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		if (!existing) {
			return {
				success: false,
				errors: { form: ["Combo no encontrado."] },
			};
		}

		if (
			existing.created_by &&
			authData?.user?.id &&
			existing.created_by !== authData.user.id
		) {
			return {
				success: false,
				errors: { form: ["No tienes permisos para modificar este combo."] },
			};
		}

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

		const { error: updateError } = await adminClient
			.from("combos")
			.update({
				name: payload.name,
				description: payload.description ?? null,
				packaging_cost: Number(payload.packagingCost ?? 0),
				suggested_price: payload.suggestedPrice ?? null,
				status: payload.status,
				image_path: imageUrl,
			})
			.eq("id", id);

		if (updateError) {
			throw new Error(updateError.message);
		}

		await adminClient.from("combo_items").delete().eq("combo_id", id);

		if (payload.items.length) {
			const items = payload.items.map((item) => ({
				combo_id: id,
				product_id: item.productId,
				qty: item.qty,
			}));

			const { error: insertError } = await adminClient
				.from("combo_items")
				.insert(items);

			if (insertError) {
				throw new Error(insertError.message);
			}
		}

		return {
			success: true,
			data: { payload: { id, ...payload } },
			message: "Combo actualizado correctamente",
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

		console.error("[updateComboAction]", error);
		return {
			success: false,
			errors: { form: ["No pudimos actualizar el combo."] },
		};
	}
}
