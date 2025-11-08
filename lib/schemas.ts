import { z } from "zod";

const optionalTrimmedString = z
	.union([z.string(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === null || value === undefined) {
			return undefined;
		}

		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	});

const requiredTrimmedString = z
	.string()
	.trim()
	.min(1, "El nombre es obligatorio")
	.max(120, "Máximo 120 caracteres");

const requiredCategoryId = z
	.union([z.string(), z.number()])
	.transform((value) => {
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : NaN;
		}

		const trimmed = String(value ?? "").trim();
		if (!trimmed) {
			return NaN;
		}

		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : NaN;
	})
	.refine((value) => Number.isInteger(value) && value > 0, {
		message: "Selecciona una categoría válida",
	});

const optionalPhoneNumber = z
	.union([z.string(), z.number(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === undefined || value === null) {
			return undefined;
		}

		if (typeof value === "number") {
			const digits = Math.trunc(value).toString().replace(/\D+/g, "");
			return digits.length ? digits : undefined;
		}

		const trimmed = String(value).trim();
		const digits = trimmed.replace(/\D+/g, "");
		return digits.length ? digits : undefined;
	})
	.refine((value) => value === undefined || value.length >= 7, {
		message: "Ingrese un teléfono válido",
	});

const optionalNumber = z
	.union([z.string(), z.number(), z.nan(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === undefined || value === null) {
			return undefined;
		}

		if (typeof value === "number") {
			return Number.isFinite(value) ? value : undefined;
		}

		const stringValue = String(value).trim();
		if (stringValue.length === 0) {
			return undefined;
		}

		const parsed = Number(stringValue.replace(/,/g, "."));
		return Number.isFinite(parsed) ? parsed : undefined;
	})
	.refine((value) => value === undefined || typeof value === "number", {
		message: "Ingrese un número válido",
	});

const nonNegativeInteger = z
	.union([z.string(), z.number(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === undefined || value === null) {
			return undefined;
		}

		if (typeof value === "number") {
			return Number.isFinite(value) ? value : NaN;
		}

		const parsed = Number(String(value).trim());
		return Number.isFinite(parsed) ? parsed : NaN;
	})
	.refine(
		(value) => value === undefined || (Number.isInteger(value) && value >= 0),
		{
			message: "Ingrese una cantidad válida",
		},
	);

const requiredMoneyAmount = z
	.union([z.string(), z.number()])
	.transform((value) => {
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : NaN;
		}

		const normalized = String(value)
			.trim()
			.replace(/\s+/g, "")
			.replace(",", ".");

		if (!normalized) {
			return NaN;
		}

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : NaN;
	})
	.refine((value) => Number.isFinite(value) && value > 0, {
		message: "Ingrese un monto válido",
	});

const nonNegativeMoneyAmount = z
	.union([z.string(), z.number(), z.null(), z.undefined()])
	.transform((value) => {
		if (value === undefined || value === null) {
			return undefined;
		}

		if (typeof value === "number") {
			return Number.isFinite(value) ? value : NaN;
		}

		const normalized = String(value)
			.trim()
			.replace(/\s+/g, "")
			.replace(",", ".");

		if (!normalized) {
			return undefined;
		}

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : NaN;
	})
	.refine(
		(value) => value === undefined || (Number.isFinite(value) && value >= 0),
		{
			message: "Ingrese un monto válido",
		},
	);

const requiredDateTimeString = z
	.union([z.string(), z.date()])
	.transform((value) => {
		if (value instanceof Date) {
			return value.toISOString();
		}

		const trimmed = String(value ?? "").trim();
		return trimmed;
	})
	.refine(
		(value) => {
			if (!value) {
				return false;
			}

			const parsed = new Date(value);
			return !Number.isNaN(parsed.getTime());
		},
		{ message: "Selecciona una fecha válida" },
	);

export const productStatusEnum = z.enum(["active", "draft", "archived"]);

export const productFormSchema = z.object({
	name: z
		.string()
		.min(1, "El nombre es obligatorio")
		.max(200, "Máximo 200 caracteres"),
	brand: optionalTrimmedString,
	sku: optionalTrimmedString,
	description: optionalTrimmedString,
	categoryId: optionalTrimmedString,
	newCategoryName: optionalTrimmedString,
	costPrice: z
		.union([z.string(), z.number()])
		.transform((value) => {
			if (typeof value === "number") {
				return Number.isFinite(value) ? value : NaN;
			}

			const normalized = String(value)
				.trim()
				.replace(/\s+/g, "")
				.replace(",", ".");

			if (!normalized) {
				return NaN;
			}

			const parsed = Number(normalized);
			return Number.isFinite(parsed) ? parsed : NaN;
		})
		.refine((value) => Number.isFinite(value) && value >= 0, {
			message: "Ingrese un costo válido",
		}),
	sellPrice: optionalNumber,
	currency: z.string().min(1, "Moneda requerida").default("NIO"),
	status: productStatusEnum.default("active"),
	quantity: nonNegativeInteger.default(0),
	imageFile: z.any().optional(),
});

export const productUpdateSchema = productFormSchema.extend({
	id: z.string().uuid("ID de producto inválido"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductUpdateValues = z.infer<typeof productUpdateSchema>;

export const categoryFormSchema = z.object({
	name: requiredTrimmedString,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const subcategoryFormSchema = z.object({
	categoryId: requiredCategoryId,
	name: requiredTrimmedString,
});

export type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>;

const comboItemSchema = z.object({
	productId: z.string().uuid("Producto inválido"),
	name: z.string().min(1),
	costPrice: z.number().min(0),
	qty: z
		.union([z.string(), z.number()])
		.transform((value) => {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : NaN;
		})
		.refine((value) => Number.isInteger(value) && value > 0, {
			message: "Cantidad inválida",
		}),
});

export const comboStatusEnum = z.enum(["active", "draft", "archived"]);

export const comboFormSchema = z.object({
	name: z.string().min(1, "Nombre requerido").max(200),
	description: optionalTrimmedString.optional(),
	packagingCost: optionalNumber.default(0),
	status: comboStatusEnum.default("active"),
	items: z.array(comboItemSchema).min(1, "Selecciona al menos 1 producto"),
	imageFile: z.any().optional(),
	suggestedPrice: optionalNumber,
	promoTag: optionalTrimmedString.optional(),
});

export const comboUpdateSchema = comboFormSchema.extend({
	id: z.string().uuid("ID de combo inválido"),
});

export type ComboItemInput = z.infer<typeof comboItemSchema>;
export type ComboFormValues = z.infer<typeof comboFormSchema>;
export type ComboUpdateValues = z.infer<typeof comboUpdateSchema>;

export const expenseTransactionTypeEnum = z.enum(["expense", "inventory"]);

export const expenseFormSchema = z.object({
	description: z
		.string()
		.min(1, "La descripción es obligatoria")
		.max(500, "Máximo 500 caracteres"),
	category: optionalTrimmedString,
	type: expenseTransactionTypeEnum.default("expense"),
	providerName: optionalTrimmedString,
	amount: requiredMoneyAmount,
	currency: z.string().min(1, "Moneda requerida").default("NIO"),
	reference: optionalTrimmedString,
	occurredAt: requiredDateTimeString,
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const positiveQuantity = z
	.union([z.string(), z.number()])
	.transform((value) => {
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : NaN;
		}

		const normalized = String(value).trim();
		if (!normalized) {
			return NaN;
		}

		const parsed = Number(normalized.replace(/,/g, "."));
		return Number.isFinite(parsed) ? parsed : NaN;
	})
	.refine((value) => Number.isInteger(value) && value > 0, {
		message: "Ingrese una cantidad válida",
	});

export const inventoryIntakeFormSchema = z
	.object({
		productId: z.string().uuid("Selecciona un producto válido"),
		providerName: optionalTrimmedString,
		quantity: positiveQuantity,
		unitCost: requiredMoneyAmount,
		totalCost: nonNegativeMoneyAmount,
		currency: z.string().min(1, "Moneda requerida").default("NIO"),
		notes: optionalTrimmedString,
		occurredAt: requiredDateTimeString,
	})
	.transform((data) => {
		const computedTotal =
			data.totalCost ?? Number(data.unitCost * data.quantity);

		return {
			...data,
			totalCost: computedTotal,
		};
	})
	.refine((data) => Number.isFinite(data.totalCost) && data.totalCost >= 0, {
		message: "El costo total debe ser mayor o igual a cero",
		path: ["totalCost"],
	});

export type InventoryIntakeFormValues = z.infer<
	typeof inventoryIntakeFormSchema
>;

const orderProductItemSchema = z.object({
	productId: z.string().uuid("Producto inválido"),
	qty: z.number().int().positive("Cantidad inválida"),
	unitPrice: z.number().min(0, "Precio inválido"),
});

const orderComboItemSchema = z.object({
	comboId: z.string().uuid("Combo inválido"),
	qty: z.number().int().positive("Cantidad inválida"),
	unitPrice: z.number().min(0, "Precio inválido"),
});

export const orderFormSchema = z
	.object({
		customerName: z
			.string()
			.min(1, "El nombre del cliente es obligatorio")
			.max(200, "Máximo 200 caracteres"),
		notes: optionalTrimmedString.optional(),
		productItems: z.array(orderProductItemSchema).default([]),
		comboItems: z.array(orderComboItemSchema).default([]),
	})
	.refine(
		(data) =>
			(data.productItems?.length ?? 0) + (data.comboItems?.length ?? 0) > 0,
		{
			message: "Agrega al menos un producto o combo",
			path: ["items"],
		},
	);

export type OrderProductItemInput = z.infer<typeof orderProductItemSchema>;
export type OrderComboItemInput = z.infer<typeof orderComboItemSchema>;
export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const orderPaymentMethodEnum = z.enum(["cash", "card", "transfer"]);

export const posOrderSchema = z
	.object({
		customerName: optionalTrimmedString.optional(),
		customerPhone: optionalPhoneNumber,
		notes: optionalTrimmedString.optional(),
		paymentMethod: orderPaymentMethodEnum.default("cash"),
		receiptNumber: optionalTrimmedString.optional(),
		currency: z.string().min(1, "Moneda requerida").default("NIO"),
		discountAmount: optionalNumber.default(0),
		taxAmount: optionalNumber.default(0),
		productItems: z.array(orderProductItemSchema).default([]),
		comboItems: z.array(orderComboItemSchema).default([]),
	})
	.refine(
		(data) =>
			(data.productItems?.length ?? 0) + (data.comboItems?.length ?? 0) > 0,
		{
			message: "Agrega al menos un producto o combo",
			path: ["items"],
		},
	)
	.refine(
		(data) =>
			data.paymentMethod !== "transfer" ||
			(typeof data.receiptNumber === "string" && data.receiptNumber.length > 0),
		{
			message: "Ingresa el número de comprobante",
			path: ["receiptNumber"],
		},
	);

export type PosOrderValues = z.infer<typeof posOrderSchema>;

export const suggestComboInputSchema = z.object({
	budgetMin: optionalNumber,
	budgetMax: optionalNumber,
	maxItems: optionalNumber,
	mustIncludeCategory: optionalTrimmedString.optional(),
});

export type SuggestComboInput = z.infer<typeof suggestComboInputSchema>;
