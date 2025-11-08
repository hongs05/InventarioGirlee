"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import { posOrderSchema } from "@/lib/schemas";
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

function parseItemsField(value: FormDataEntryValue | null) {
	if (!value) return [];

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		} catch (error) {
			console.error("[parseItemsField] Invalid payload", error);
		}
	}

	return [];
}

function parsePosForm(formData: FormData) {
	const parsed = posOrderSchema.safeParse({
		customerName: formData.get("customerName"),
		customerPhone: formData.get("customerPhone"),
		notes: formData.get("notes"),
		paymentMethod: formData.get("paymentMethod"),
		receiptNumber: formData.get("receiptNumber"),
		currency: formData.get("currency"),
		discountAmount: formData.get("discountAmount"),
		taxAmount: formData.get("taxAmount"),
		productItems: parseItemsField(formData.get("productItems")),
		comboItems: parseItemsField(formData.get("comboItems")),
	});

	if (!parsed.success) {
		throw parsed.error;
	}

	return parsed.data;
}

function roundCurrency(value: number): number {
	return Number(Number(value ?? 0).toFixed(2));
}

function safeNumber(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function generateReceiptNumber() {
	const now = new Date();
	const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
		2,
		"0",
	)}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(
		2,
		"0",
	)}${String(now.getMinutes()).padStart(2, "0")}${String(
		now.getSeconds(),
	).padStart(2, "0")}`;
	const randomSegment = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `POS-${timestamp}-${randomSegment}`;
}

type ProductRow = {
	id: string;
	name: string | null;
	cost_price: number | null;
	quantity: number | null;
	status: string | null;
};

type ComboItemRow = {
	product_id: string | null;
	qty: number | null;
};

type ComboRow = {
	id: string;
	name: string;
	packaging_cost: number | null;
	combo_items: ComboItemRow[] | null;
};

type ProductLineRecord = {
	order_id: string;
	product_id: string;
	qty: number;
	unit_price: number;
	unit_cost: number;
	line_total: number;
	line_cost_total: number;
};

type ComboLineRecord = {
	order_id: string;
	combo_id: string;
	qty: number;
	unit_price: number;
	unit_cost: number;
	line_total: number;
	line_cost_total: number;
};

type LineItemInsertRecord = Record<string, unknown> & {
	line_total?: number;
	line_cost_total?: number;
};

function isGeneratedColumnError(error: PostgrestError | null): boolean {
	if (!error?.message) {
		return false;
	}

	const message = error.message.toLowerCase();
	return (
		message.includes("non-default value") ||
		message.includes("generated column")
	);
}

async function insertLineItemsWithFallback(
	adminClient: ReturnType<typeof createSupabaseAdminClient>,
	table: string,
	records: LineItemInsertRecord[],
): Promise<void> {
	if (!records.length) {
		return;
	}

	const variants: Array<
		(record: LineItemInsertRecord) => Record<string, unknown>
	> = [
		(record) => ({ ...record }),
		(record) => {
			if (!("line_total" in record)) {
				return { ...record };
			}

			const { line_total: _ignored, ...rest } = record;
			return { ...rest };
		},
		(record) => {
			const {
				line_total: _ignoredLineTotal,
				line_cost_total: _ignoredLineCostTotal,
				...rest
			} = record;
			return { ...rest };
		},
	];

	let lastError: PostgrestError | null = null;

	for (const buildPayload of variants) {
		const payload = records.map((record) => buildPayload(record));
		const { error } = await adminClient.from(table).insert(payload);

		if (!error) {
			return;
		}

		if (!isGeneratedColumnError(error)) {
			throw new Error(error.message);
		}

		lastError = error;
	}

	if (lastError) {
		throw new Error(lastError.message);
	}
}

type InventoryRequirement = {
	name: string;
	required: number;
	available: number;
	status: string | null;
};

type CreateSaleResult = {
	orderId: string;
	receiptNumber: string | null;
	profitAmount: number;
};

export async function createSaleAction(
	formData: FormData,
): Promise<ActionResult<CreateSaleResult>> {
	let createdOrderId: string | null = null;

	try {
		const payload = parsePosForm(formData);
		const supabase = await createSupabaseServerClient();
		const adminClient = createSupabaseAdminClient();

		const [{ data: authData }] = await Promise.all([supabase.auth.getUser()]);

		const directProductIds = new Set(
			payload.productItems.map((item) => item.productId),
		);
		const comboIds = new Set(payload.comboItems.map((item) => item.comboId));

		let combos: ComboRow[] = [];
		if (comboIds.size) {
			const { data, error } = await adminClient
				.from("combos")
				.select("id, name, packaging_cost, combo_items(product_id, qty)")
				.in("id", Array.from(comboIds));

			if (error) {
				throw new Error(error.message);
			}

			combos = (data ?? []) as ComboRow[];
		}

		const comboItemsProductIds = new Set<string>();
		for (const combo of combos) {
			for (const item of combo.combo_items ?? []) {
				if (item?.product_id) {
					comboItemsProductIds.add(item.product_id);
				}
			}
		}

		const allProductIds = new Set<string>([
			...directProductIds,
			...comboItemsProductIds,
		]);
		const productMap = new Map<string, ProductRow>();

		if (allProductIds.size) {
			const { data, error } = await adminClient
				.from("products")
				.select("id, name, cost_price, quantity, status")
				.in("id", Array.from(allProductIds));

			if (error) {
				throw new Error(error.message);
			}

			for (const product of (data ?? []) as ProductRow[]) {
				productMap.set(product.id, product);
			}
		}

		const missingProducts: string[] = [];
		for (const productId of allProductIds) {
			if (!productMap.has(productId)) {
				missingProducts.push(productId);
			}
		}

		if (missingProducts.length) {
			return {
				success: false,
				errors: {
					form: [
						`No pudimos encontrar inventario para: ${missingProducts.join(
							", ",
						)}. Verifica que existan y estén activos.`,
					],
				},
			};
		}

		const productLineRecords: ProductLineRecord[] = [];
		const comboLineRecords: ComboLineRecord[] = [];
		const requirements = new Map<string, InventoryRequirement>();

		for (const item of payload.productItems) {
			const product = productMap.get(item.productId);
			if (!product) {
				return {
					success: false,
					errors: {
						form: [
							`El producto con ID ${item.productId} no existe. Recarga la página e inténtalo nuevamente.`,
						],
					},
				};
			}

			const unitCost = roundCurrency(safeNumber(product.cost_price));
			const unitPrice = roundCurrency(item.unitPrice);
			const qty = Math.max(1, item.qty);
			const lineTotal = roundCurrency(unitPrice * qty);
			const lineCostTotal = roundCurrency(unitCost * qty);

			productLineRecords.push({
				order_id: "",
				product_id: item.productId,
				qty,
				unit_price: unitPrice,
				unit_cost: unitCost,
				line_total: lineTotal,
				line_cost_total: lineCostTotal,
			});

			const available = safeNumber(product.quantity);
			const existing = requirements.get(item.productId);
			const required = (existing?.required ?? 0) + qty;

			requirements.set(item.productId, {
				name: product.name ?? "Producto",
				required,
				available,
				status: existing?.status ?? product.status ?? null,
			});
		}

		const comboMap = new Map<string, ComboRow>();
		for (const combo of combos) {
			comboMap.set(combo.id, combo);
		}

		for (const item of payload.comboItems) {
			const combo = comboMap.get(item.comboId);
			if (!combo) {
				return {
					success: false,
					errors: {
						form: [
							`El combo seleccionado ya no existe. Recarga la página e inténtalo nuevamente.`,
						],
					},
				};
			}

			const components = combo.combo_items ?? [];
			if (!components.length) {
				return {
					success: false,
					errors: {
						form: [
							`El combo ${combo.name} no tiene productos asociados. Revisa su configuración.`,
						],
					},
				};
			}

			const qty = Math.max(1, item.qty);
			let comboUnitCost = roundCurrency(safeNumber(combo.packaging_cost));

			for (const component of components) {
				if (!component?.product_id) {
					continue;
				}

				const product = productMap.get(component.product_id);
				if (!product) {
					return {
						success: false,
						errors: {
							form: [
								`El producto requerido por el combo ${combo.name} no está disponible. Actualiza el combo e inténtalo nuevamente.`,
							],
						},
					};
				}

				const componentQty = Math.max(1, component.qty ?? 0);
				const requiredQty = componentQty * qty;
				const unitCost = roundCurrency(safeNumber(product.cost_price));
				comboUnitCost = roundCurrency(comboUnitCost + unitCost * componentQty);

				const existing = requirements.get(component.product_id);
				const available = safeNumber(product.quantity);
				requirements.set(component.product_id, {
					name: product.name ?? "Producto",
					required: (existing?.required ?? 0) + requiredQty,
					available,
					status: existing?.status ?? product.status ?? null,
				});
			}

			const unitPrice = roundCurrency(item.unitPrice);
			const lineTotal = roundCurrency(unitPrice * qty);
			const lineCostTotal = roundCurrency(comboUnitCost * qty);

			comboLineRecords.push({
				order_id: "",
				combo_id: item.comboId,
				qty,
				unit_price: unitPrice,
				unit_cost: comboUnitCost,
				line_total: lineTotal,
				line_cost_total: lineCostTotal,
			});
		}

		const insufficientProducts: string[] = [];
		for (const requirement of requirements.values()) {
			if (requirement.available < requirement.required) {
				insufficientProducts.push(
					`${requirement.name} (disponible: ${requirement.available}, requerido: ${requirement.required})`,
				);
			}
		}

		if (insufficientProducts.length) {
			return {
				success: false,
				errors: {
					form: [
						`Inventario insuficiente para: ${insufficientProducts.join(
							", ",
						)}. Actualiza existencias e inténtalo de nuevo.`,
					],
				},
			};
		}

		const subtotal = roundCurrency(
			productLineRecords.reduce((acc, line) => acc + line.line_total, 0) +
				comboLineRecords.reduce((acc, line) => acc + line.line_total, 0),
		);
		const discount = Math.max(0, roundCurrency(payload.discountAmount ?? 0));
		const tax = Math.max(0, roundCurrency(payload.taxAmount ?? 0));
		const totalCost = roundCurrency(
			productLineRecords.reduce((acc, line) => acc + line.line_cost_total, 0) +
				comboLineRecords.reduce((acc, line) => acc + line.line_cost_total, 0),
		);
		let total = roundCurrency(subtotal - discount + tax);
		if (total < 0) {
			total = 0;
		}
		const profit = roundCurrency(total - totalCost);

		const receiptNumber =
			payload.receiptNumber ??
			(payload.paymentMethod === "transfer"
				? generateReceiptNumber()
				: generateReceiptNumber());

		const { data: order, error: orderError } = await adminClient
			.from("orders")
			.insert({
				receipt_number: receiptNumber,
				customer_name: payload.customerName ?? null,
				customer_phone: payload.customerPhone ?? null,
				notes: payload.notes ?? null,
				status: "completed",
				payment_method: payload.paymentMethod,
				payment_reference:
					payload.paymentMethod === "transfer"
						? payload.receiptNumber ?? receiptNumber
						: null,
				subtotal_amount: subtotal,
				discount_amount: discount,
				tax_amount: tax,
				total_amount: total,
				total_cost: totalCost,
				profit_amount: profit,
				currency: payload.currency ?? "NIO",
				created_by: authData?.user?.id ?? null,
			})
			.select("id, receipt_number")
			.single();

		if (orderError || !order) {
			console.log(orderError);
			throw new Error(orderError?.message ?? "No pudimos registrar la venta");
		}

		createdOrderId = order.id;

		if (productLineRecords.length) {
			const productRecordsWithOrder: LineItemInsertRecord[] =
				productLineRecords.map((record) => ({
					order_id: order.id,
					product_id: record.product_id,
					qty: record.qty,
					unit_price: record.unit_price,
					unit_cost: record.unit_cost,
					line_total: record.line_total,
					line_cost_total: record.line_cost_total,
				}));

			await insertLineItemsWithFallback(
				adminClient,
				"order_product_items",
				productRecordsWithOrder,
			);
		}

		if (comboLineRecords.length) {
			const comboRecordsWithOrder: LineItemInsertRecord[] =
				comboLineRecords.map((record) => ({
					order_id: order.id,
					combo_id: record.combo_id,
					qty: record.qty,
					unit_price: record.unit_price,
					unit_cost: record.unit_cost,
					line_total: record.line_total,
					line_cost_total: record.line_cost_total,
				}));

			await insertLineItemsWithFallback(
				adminClient,
				"order_combo_items",
				comboRecordsWithOrder,
			);
		}

		const inventoryUpdates = Array.from(requirements.entries()).map(
			([productId, requirement]) => ({
				productId,
				newQuantity: Math.max(requirement.available - requirement.required, 0),
				previousQuantity: requirement.available,
				previousStatus: requirement.status ?? null,
			}),
		);

		for (let index = 0; index < inventoryUpdates.length; index += 1) {
			const update = inventoryUpdates[index];
			const updatePayload: Record<string, unknown> = {
				quantity: update.newQuantity,
			};

			if (update.newQuantity <= 0) {
				updatePayload.status = "archived";
			}

			const { error: updateError } = await adminClient
				.from("products")
				.update(updatePayload)
				.eq("id", update.productId);

			if (updateError) {
				for (let revertIndex = 0; revertIndex < index; revertIndex += 1) {
					const revert = inventoryUpdates[revertIndex];
					const revertPayload: Record<string, unknown> = {
						quantity: revert.previousQuantity,
					};

					if (typeof revert.previousStatus === "string") {
						revertPayload.status = revert.previousStatus;
					}

					await adminClient
						.from("products")
						.update(revertPayload)
						.eq("id", revert.productId);
				}

				throw new Error(updateError.message);
			}
		}

		return {
			success: true,
			data: {
				orderId: order.id,
				receiptNumber: order.receipt_number ?? receiptNumber,
				profitAmount: profit,
			},
			message: "Venta registrada correctamente",
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

		console.error("[createSaleAction]", error);

		if (createdOrderId) {
			try {
				const adminClient = createSupabaseAdminClient();
				await adminClient.from("orders").delete().eq("id", createdOrderId);
			} catch (cleanupError) {
				console.error(
					"[createSaleAction] Failed to cleanup order",
					cleanupError,
				);
			}
		}

		return {
			success: false,
			errors: {
				form: [
					"No pudimos registrar la venta. Verifica la información e inténtalo nuevamente.",
				],
			},
		};
	}
}
