"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import {
	expenseFormSchema,
	inventoryIntakeFormSchema,
	type ExpenseFormValues,
	type InventoryIntakeFormValues,
} from "@/lib/schemas";
import {
	MissingEnvironmentVariableError,
	createSupabaseAdminClient,
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

function parseExpenseForm(formData: FormData): ExpenseFormValues {
	const parsed = expenseFormSchema.safeParse({
		description: formData.get("description"),
		category: formData.get("category"),
		type: formData.get("type"),
		providerName: formData.get("providerName"),
		amount: formData.get("amount"),
		currency: formData.get("currency"),
		reference: formData.get("reference"),
		occurredAt: formData.get("occurredAt"),
	});

	if (!parsed.success) {
		throw parsed.error;
	}

	return parsed.data;
}

function parseInventoryIntakeForm(
	formData: FormData,
): InventoryIntakeFormValues {
	const parsed = inventoryIntakeFormSchema.safeParse({
		productId: formData.get("productId"),
		providerName: formData.get("providerName"),
		quantity: formData.get("quantity"),
		unitCost: formData.get("unitCost"),
		totalCost: formData.get("totalCost"),
		currency: formData.get("currency"),
		notes: formData.get("notes"),
		occurredAt: formData.get("occurredAt"),
	});

	if (!parsed.success) {
		throw parsed.error;
	}

	return parsed.data;
}

function roundCurrency(value: number): number {
	return Number(Number(value ?? 0).toFixed(2));
}

function toISOString(value: string): string {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? new Date().toISOString()
		: parsed.toISOString();
}

function safeNumber(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

type CreateExpenseResult = { id: string };

type CreateInventoryIntakeResult = {
	intakeId: string;
	productId: string;
	newQuantity: number;
	expenseId?: string | null;
};

export type ExpenseFormState = ActionResult<CreateExpenseResult> | null;
export type InventoryIntakeFormState =
	ActionResult<CreateInventoryIntakeResult> | null;

export async function createExpenseAction(
	formData: FormData,
): Promise<ActionResult<CreateExpenseResult>> {
	try {
		const payload = parseExpenseForm(formData);
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();

		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);
		const userId = authData?.user?.id ?? null;

		const { data, error } = await adminClient
			.from("expense_transactions")
			.insert({
				description: payload.description,
				category: payload.category ?? null,
				type: payload.type ?? "expense",
				provider_name: payload.providerName ?? null,
				amount: roundCurrency(payload.amount),
				currency: payload.currency ?? "NIO",
				reference: payload.reference ?? null,
				occurred_at: toISOString(payload.occurredAt),
				created_by: userId,
			})
			.select("id")
			.single();

		if (error || !data) {
			throw new Error(error?.message ?? "No pudimos registrar el gasto");
		}

		revalidatePath("/finance");
		revalidatePath("/dashboard");
		revalidatePath("/inventory");

		return {
			success: true,
			data: { id: data.id },
			message: "Transacción registrada correctamente",
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

		console.error("[createExpenseAction]", error);
		return {
			success: false,
			errors: {
				form: [
					"No pudimos registrar la transacción. Verifica la información e inténtalo nuevamente.",
				],
			},
		};
	}
}

export async function createInventoryIntakeAction(
	formData: FormData,
): Promise<ActionResult<CreateInventoryIntakeResult>> {
	let intakeId: string | null = null;
	let previousQuantity = 0;
	let productId: string | null = null;

	try {
		const payload = parseInventoryIntakeForm(formData);
		productId = payload.productId;
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();

		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);
		const userId = authData?.user?.id ?? null;

		const { data: product, error: productError } = await adminClient
			.from("products")
			.select("id, name, quantity")
			.eq("id", payload.productId)
			.single();

		if (productError || !product) {
			return {
				success: false,
				errors: {
					form: [
						"No pudimos encontrar el producto seleccionado. Actualiza la página e inténtalo nuevamente.",
					],
				},
			};
		}

		previousQuantity = safeNumber(product.quantity);
		const newQuantity = previousQuantity + payload.quantity;

		const roundedUnitCost = roundCurrency(payload.unitCost);
		const roundedTotalCost = roundCurrency(payload.totalCost);

		const { data: intake, error: intakeError } = await adminClient
			.from("inventory_intake")
			.insert({
				product_id: payload.productId,
				provider_name: payload.providerName ?? null,
				quantity: payload.quantity,
				unit_cost: roundedUnitCost,
				total_cost: roundedTotalCost,
				currency: payload.currency ?? "NIO",
				notes: payload.notes ?? null,
				occurred_at: toISOString(payload.occurredAt),
				created_by: userId,
			})
			.select("id")
			.single();

		if (intakeError || !intake) {
			throw new Error(
				intakeError?.message ?? "No pudimos registrar el ingreso",
			);
		}

		intakeId = intake.id;

		const { error: updateProductError } = await adminClient
			.from("products")
			.update({ quantity: newQuantity })
			.eq("id", payload.productId);

		if (updateProductError) {
			await adminClient.from("inventory_intake").delete().eq("id", intake.id);
			throw new Error(updateProductError.message);
		}

		const expenseDescription = payload.notes?.trim().length
			? payload.notes.trim()
			: `Ingreso de inventario - ${product.name ?? "Producto"}`;

		const { data: expense, error: expenseError } = await adminClient
			.from("expense_transactions")
			.insert({
				description: expenseDescription,
				category: "inventario",
				type: "inventory",
				provider_name: payload.providerName ?? null,
				amount: roundedTotalCost,
				currency: payload.currency ?? "NIO",
				reference: null,
				occurred_at: toISOString(payload.occurredAt),
				created_by: userId,
			})
			.select("id")
			.single();

		if (expenseError) {
			await adminClient
				.from("products")
				.update({ quantity: previousQuantity })
				.eq("id", payload.productId);
			await adminClient.from("inventory_intake").delete().eq("id", intake.id);
			throw new Error(expenseError.message);
		}

		revalidatePath("/finance");
		revalidatePath("/inventory");
		revalidatePath("/dashboard");

		return {
			success: true,
			data: {
				intakeId: intake.id,
				productId: payload.productId,
				newQuantity,
				expenseId: expense?.id ?? null,
			},
			message: "Ingreso de inventario registrado correctamente",
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

		console.error("[createInventoryIntakeAction]", error);

		if (intakeId) {
			try {
				const adminClient = createSupabaseAdminClient();
				await adminClient.from("inventory_intake").delete().eq("id", intakeId);
				await adminClient
					.from("products")
					.update({ quantity: previousQuantity })
					.eq("id", productId ?? "");
			} catch (cleanupError) {
				console.error(
					"[createInventoryIntakeAction] Failed to cleanup after error",
					cleanupError,
				);
			}
		}

		return {
			success: false,
			errors: {
				form: [
					"No pudimos registrar el ingreso de inventario. Verifica la información e inténtalo nuevamente.",
				],
			},
		};
	}
}

export async function submitExpenseAction(
	prevState: ExpenseFormState,
	formData: FormData,
): Promise<ExpenseFormState> {
	return createExpenseAction(formData);
}

export async function submitInventoryIntakeAction(
	prevState: InventoryIntakeFormState,
	formData: FormData,
): Promise<InventoryIntakeFormState> {
	return createInventoryIntakeAction(formData);
}
