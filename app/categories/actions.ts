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
