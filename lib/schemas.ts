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
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : NaN;
		})
		.refine((value) => Number.isFinite(value) && value >= 0, {
			message: "Ingrese un costo válido",
		}),
	sellPrice: optionalNumber,
	currency: z.string().min(1, "Moneda requerida").default("NIO"),
	status: productStatusEnum.default("active"),
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

export const suggestComboInputSchema = z.object({
	budgetMin: optionalNumber,
	budgetMax: optionalNumber,
	maxItems: optionalNumber,
	mustIncludeCategory: optionalTrimmedString.optional(),
});

export type SuggestComboInput = z.infer<typeof suggestComboInputSchema>;
