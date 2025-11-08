"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PriceTiers } from "@/components/PriceTiers";
import { UploadImage } from "@/components/UploadImage";
import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import { recommendPrice, type PriceRecommendation } from "@/lib/pricing";
import {
	ProductFormValues,
	productFormSchema,
	productStatusEnum,
} from "@/lib/schemas";

export type CategoryOption = {
	id: number;
	name: string;
};

type ProductFormProps = {
	categories: CategoryOption[];
	defaultValues?: Partial<ProductFormValues> & {
		id?: string;
		imageUrl?: string | null;
	};
	submitAction: (formData: FormData) => Promise<ActionResult<unknown>>;
	submitLabel?: string;
	heading?: string;
};

const statusOptions = productStatusEnum.options;

type GenerateSkuArgs = {
	categoryName?: string;
	brand?: string;
	productName?: string;
};

function generateSkuFromValues({
	categoryName,
	brand,
	productName,
}: GenerateSkuArgs): string | null {
	const categorySegment = extractPrefix(categoryName, 3);
	const brandSegment = extractPrefix(brand, 3);
	const nameSegment = extractInitials(productName, 4);

	const segments = [categorySegment, brandSegment, nameSegment].filter(
		(segment) => segment.length > 0,
	);

	if (!segments.length) {
		return null;
	}

	const base = segments.join("-");
	const suffix = computeNumericSuffix(segments.join("|"));

	return suffix ? `${base}-${suffix}` : base;
}

function extractPrefix(value: string | undefined, length: number): string {
	const normalized = normalizeForSku(value).replace(/\s+/g, "");
	if (!normalized) {
		return "";
	}

	return normalized.slice(0, length).toUpperCase();
}

function extractInitials(value: string | undefined, length: number): string {
	const normalized = normalizeForSku(value);
	if (!normalized) {
		return "";
	}

	const words = normalized.split(/\s+/).filter(Boolean);
	if (!words.length) {
		return "";
	}

	const initials = words.map((word) => word[0]).join("");
	const fallback = normalized.replace(/\s+/g, "");
	const combined = `${initials}${fallback}`.toUpperCase();

	return combined.slice(0, length);
}

function normalizeForSku(value: string | undefined): string {
	if (!value) {
		return "";
	}

	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^A-Za-z0-9\s]+/g, " ")
		.trim();
}

function computeNumericSuffix(source: string): string {
	if (!source) {
		return "";
	}

	let hash = 0;
	for (let index = 0; index < source.length; index += 1) {
		hash = (hash * 31 + source.charCodeAt(index)) & 0xffffffff;
	}

	const numeric = Math.abs(hash) % 1000;
	return numeric.toString().padStart(3, "0");
}

export function ProductForm({
	categories,
	defaultValues,
	submitAction,
	submitLabel = "Guardar producto",
	heading = "Información del producto",
}: ProductFormProps) {
	const [serverErrors, setServerErrors] = useState<ActionErrorRecord | null>(
		null,
	);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [showRecommendations, setShowRecommendations] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [imageKey, setImageKey] = useState(0);
	const isEditing = Boolean(
		defaultValues && Object.keys(defaultValues).length > 0,
	);
	const form = useForm<ProductFormValues>({
		resolver: zodResolver(productFormSchema),
		defaultValues: {
			name: defaultValues?.name ?? "",
			brand: defaultValues?.brand,
			sku: defaultValues?.sku,
			description: defaultValues?.description,
			categoryId: defaultValues?.categoryId,
			newCategoryName: defaultValues?.newCategoryName,
			costPrice: defaultValues?.costPrice ?? 0,
			sellPrice: defaultValues?.sellPrice,
			currency: defaultValues?.currency ?? "NIO",
			status: defaultValues?.status ?? "active",
			quantity: defaultValues?.quantity ?? 0,
			imageFile: undefined,
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		reset,
		control,
		setError,
		clearErrors,
	} = form;

	const costPrice = useWatch({ control, name: "costPrice" });
	const categoryId = useWatch({ control, name: "categoryId" });
	const currencyValue = useWatch({ control, name: "currency" }) ?? "NIO";
	const nameValue = useWatch({ control, name: "name" }) ?? "";
	const brandValue = useWatch({ control, name: "brand" }) ?? "";

	const selectedCategoryName = useMemo(() => {
		if (!categoryId) return undefined;
		const match = categories.find(
			(category) => String(category.id) === String(categoryId),
		);
		return match?.name;
	}, [categoryId, categories]);

	const recommendation = useMemo(() => {
		const parsedCost = Number(costPrice ?? 0);
		if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
			return null;
		}

		try {
			return recommendPrice({
				costPrice: parsedCost,
				categoryName: selectedCategoryName,
			});
		} catch (error) {
			console.error("Failed to recommend price", error);
			return null;
		}
	}, [costPrice, selectedCategoryName]);

	const handleTierSelect = useCallback(
		(_tier: PriceRecommendation["appliedTier"], value: number) => {
			setValue("sellPrice", Number(value.toFixed(2)), {
				shouldDirty: true,
				shouldValidate: true,
			});
			setShowRecommendations(true);
		},
		[setShowRecommendations, setValue],
	);

	const handleGenerateSku = useCallback(() => {
		clearErrors("sku");
		const generated = generateSkuFromValues({
			categoryName: selectedCategoryName,
			brand: brandValue,
			productName: nameValue,
		});

		if (!generated) {
			setError("sku", {
				type: "manual",
				message:
					"Completa al menos el nombre, la marca o la categoría para generar un SKU.",
			});
			return;
		}

		setValue("sku", generated, { shouldDirty: true, shouldValidate: true });
	}, [
		brandValue,
		clearErrors,
		nameValue,
		selectedCategoryName,
		setError,
		setValue,
	]);

	const onSubmit = handleSubmit((values) => {
		const formData = new FormData();
		formData.append("name", values.name);
		if (values.brand) formData.append("brand", values.brand);
		if (values.sku) formData.append("sku", values.sku);
		if (values.description) formData.append("description", values.description);
		if (values.categoryId)
			formData.append("categoryId", String(values.categoryId));
		if (values.newCategoryName)
			formData.append("newCategoryName", values.newCategoryName);
		formData.append("costPrice", String(values.costPrice));
		if (values.sellPrice !== undefined)
			formData.append("sellPrice", String(values.sellPrice));
		formData.append("currency", values.currency ?? "NIO");
		formData.append("status", values.status);
		formData.append("quantity", String(values.quantity ?? 0));
		if (values.imageFile instanceof File)
			formData.append("imageFile", values.imageFile);

		setServerErrors(null);
		setSuccessMessage(null);

		startTransition(async () => {
			const result = await submitAction(formData);
			if (!result.success) {
				setServerErrors(result.errors);
				return;
			}

			setSuccessMessage(result.message ?? "Producto listo para guardar");
			if (!isEditing) {
				reset({
					name: "",
					brand: undefined,
					sku: undefined,
					description: undefined,
					categoryId: undefined,
					newCategoryName: undefined,
					costPrice: 0,
					sellPrice: undefined,
					currency: values.currency ?? "NIO",
					status: "active",
					quantity: 0,
					imageFile: undefined,
				});
				setImageKey((prev) => prev + 1);
			}
		});
	});

	return (
		<form
			onSubmit={onSubmit}
			className='space-y-8'
			encType='multipart/form-data'>
			<div className='space-y-2'>
				<h2 className='text-xl font-semibold text-gray-900'>{heading}</h2>
				<p className='text-sm text-gray-500'>
					Completa los campos para administrar tu inventario.
				</p>
			</div>

			{successMessage && (
				<div className='rounded-md border border-blush-200 bg-blush-50 px-4 py-3 text-sm text-blush-700'>
					{successMessage}
				</div>
			)}

			{serverErrors?.form && (
				<div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
					{serverErrors.form.join(" ")}
				</div>
			)}

			<div className='grid gap-6 md:grid-cols-[2fr,1fr]'>
				<div className='space-y-6'>
					<div className='space-y-2'>
						<label className='text-sm font-medium text-gray-700' htmlFor='name'>
							Nombre
						</label>
						<input
							id='name'
							type='text'
							autoComplete='off'
							{...register("name")}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						{errors.name && (
							<p className='text-xs text-red-500'>{errors.name.message}</p>
						)}
					</div>

					<div className='space-y-2'>
						<label
							className='text-sm font-medium text-gray-700'
							htmlFor='brand'>
							Marca
						</label>
						<input
							id='brand'
							type='text'
							autoComplete='off'
							{...register("brand")}
							placeholder='Ej. Neutrogena'
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						{errors.brand && (
							<p className='text-xs text-red-500'>{errors.brand.message}</p>
						)}
					</div>

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<label
									className='text-sm font-medium text-gray-700'
									htmlFor='sku'>
									SKU
								</label>
								<button
									type='button'
									onClick={handleGenerateSku}
									className='inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100'>
									Generar
								</button>
							</div>
							<input
								id='sku'
								type='text'
								autoComplete='off'
								{...register("sku")}
								placeholder='Opcional'
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{errors.sku && (
								<p className='text-xs text-red-500'>{errors.sku.message}</p>
							)}
						</div>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='status'>
								Estado
							</label>
							<select
								id='status'
								{...register("status")}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{status === "active"
											? "Activo"
											: status === "draft"
											? "Borrador"
											: "Archivado"}
									</option>
								))}
							</select>
							{errors.status && (
								<p className='text-xs text-red-500'>{errors.status.message}</p>
							)}
						</div>
					</div>

					<div className='space-y-2'>
						<label
							className='text-sm font-medium text-gray-700'
							htmlFor='description'>
							Descripción
						</label>
						<textarea
							id='description'
							rows={4}
							{...register("description")}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							placeholder='Detalles, beneficios, formato, etc.'
						/>
						{errors.description && (
							<p className='text-xs text-red-500'>
								{errors.description.message}
							</p>
						)}
					</div>

					<div className='space-y-2'>
						<label
							className='text-sm font-medium text-gray-700'
							htmlFor='quantity'>
							Cantidad en inventario
						</label>
						<input
							id='quantity'
							type='number'
							min={0}
							step={1}
							{...register("quantity", { valueAsNumber: true })}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						{errors.quantity && (
							<p className='text-xs text-red-500'>{errors.quantity.message}</p>
						)}
					</div>

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='categoryId'>
								Categoría
							</label>
							<select
								id='categoryId'
								{...register("categoryId")}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
								defaultValue={defaultValues?.categoryId ?? ""}>
								<option value=''>Selecciona una categoría</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
							{errors.categoryId && (
								<p className='text-xs text-red-500'>
									{errors.categoryId.message}
								</p>
							)}
						</div>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='newCategoryName'>
								Crear categoría (opcional)
							</label>
							<input
								id='newCategoryName'
								type='text'
								placeholder='Nombre de la nueva categoría'
								{...register("newCategoryName")}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{errors.newCategoryName && (
								<p className='text-xs text-red-500'>
									{errors.newCategoryName.message}
								</p>
							)}
							<p className='text-xs text-gray-500'>
								Si llenas este campo, crearemos la categoría automáticamente al
								guardar.
							</p>
						</div>
					</div>

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='costPrice'>
								Costo (NIO)
							</label>
							<input
								id='costPrice'
								type='number'
								step='0.01'
								min={0}
								{...register("costPrice", { valueAsNumber: true })}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{errors.costPrice && (
								<p className='text-xs text-red-500'>
									{errors.costPrice.message}
								</p>
							)}
						</div>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='sellPrice'>
								Precio venta (override)
							</label>
							<input
								id='sellPrice'
								type='number'
								step='0.01'
								min={0}
								{...register("sellPrice", { valueAsNumber: true })}
								placeholder='Opcional'
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{errors.sellPrice && (
								<p className='text-xs text-red-500'>
									{errors.sellPrice.message}
								</p>
							)}
						</div>
					</div>

					<div className='space-y-3'>
						<button
							type='button'
							onClick={() => setShowRecommendations(true)}
							className='inline-flex items-center rounded-md border border-blush-200 bg-blush-50 px-3 py-2 text-sm font-medium text-blush-600 transition hover:bg-blush-100'>
							Obtener recomendaciones
						</button>

						{showRecommendations && (
							<PriceTiers
								recommendation={recommendation}
								currency={currencyValue}
								onSelectTier={handleTierSelect}
							/>
						)}
					</div>
				</div>

				<div className='space-y-6'>
					<UploadImage
						key={imageKey}
						name='imageFile'
						label='Imagen del producto'
						defaultPreview={defaultValues?.imageUrl ?? null}
						helperText='Formatos: JPG, PNG, WEBP. Tamaño recomendado: 800x800px'
						onFileChange={(file) =>
							setValue("imageFile", file ?? undefined, { shouldDirty: true })
						}
					/>

					<div className='space-y-2'>
						<label
							className='text-sm font-medium text-gray-700'
							htmlFor='currency'>
							Moneda
						</label>
						<input
							id='currency'
							type='text'
							{...register("currency")}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							placeholder='NIO'
						/>
						{errors.currency && (
							<p className='text-xs text-red-500'>{errors.currency.message}</p>
						)}
					</div>
				</div>
			</div>

			<div className='flex items-center justify-end gap-3'>
				<button
					type='submit'
					disabled={isSubmitting || isPending}
					className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:opacity-60'>
					{isSubmitting || isPending ? "Guardando…" : submitLabel}
				</button>
			</div>
		</form>
	);
}
