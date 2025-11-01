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

export const productStatusEnum = z.enum(["active", "draft", "archived"]);

export const productFormSchema = z.object({
	name: z
		.string()
		.min(1, "El nombre es obligatorio")
		.max(200, "Máximo 200 caracteres"),
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
});

export const comboUpdateSchema = comboFormSchema.extend({
	id: z.string().uuid("ID de combo inválido"),
});

export type ComboItemInput = z.infer<typeof comboItemSchema>;
export type ComboFormValues = z.infer<typeof comboFormSchema>;
export type ComboUpdateValues = z.infer<typeof comboUpdateSchema>;

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
		customerPhone: optionalTrimmedString.optional(),
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
