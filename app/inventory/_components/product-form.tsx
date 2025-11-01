"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UploadImage } from "@/components/UploadImage";
import { PriceTiers } from "@/components/PriceTiers";
import { recommendPrice } from "@/lib/pricing";
import {
	ProductFormValues,
	productFormSchema,
	productStatusEnum,
} from "@/lib/schemas";
import type { ActionErrorRecord, ActionResult } from "@/lib/actions";

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
	const isEditing = Boolean(defaultValues?.id);

	const form = useForm<ProductFormValues>({
		resolver: zodResolver(productFormSchema),
		defaultValues: {
			name: defaultValues?.name ?? "",
			sku: defaultValues?.sku,
			description: defaultValues?.description,
			categoryId: defaultValues?.categoryId,
			newCategoryName: defaultValues?.newCategoryName,
			costPrice: defaultValues?.costPrice ?? 0,
			sellPrice: defaultValues?.sellPrice,
			currency: defaultValues?.currency ?? "NIO",
			status: defaultValues?.status ?? "active",
			imageFile: undefined,
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting },
		setValue,
		reset,
	} = form;

	const costPrice = watch("costPrice");
	const categoryId = watch("categoryId");

	const selectedCategoryName = useMemo(() => {
		if (!categoryId) return undefined;
		const match = categories.find(
			(category) => String(category.id) === String(categoryId),
		);
		return match?.name;
	}, [categoryId, categories]);

	const recommendation = useMemo(() => {
		if (!costPrice || Number(costPrice) <= 0) {
			return null;
		}

		try {
			return recommendPrice({
				costPrice: Number(costPrice),
				categoryName: selectedCategoryName,
			});
		} catch (error) {
			console.error("Failed to recommend price", error);
			return null;
		}
	}, [costPrice, selectedCategoryName]);

	const onSubmit = handleSubmit((values) => {
		const formData = new FormData();
		formData.append("name", values.name);
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
					sku: undefined,
					description: undefined,
					categoryId: undefined,
					newCategoryName: undefined,
					costPrice: 0,
					sellPrice: undefined,
					currency: values.currency ?? "NIO",
					status: "active",
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
				<div className='rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
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
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
						/>
						{errors.name && (
							<p className='text-xs text-red-500'>{errors.name.message}</p>
						)}
					</div>

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<label
								className='text-sm font-medium text-gray-700'
								htmlFor='sku'>
								SKU
							</label>
							<input
								id='sku'
								type='text'
								autoComplete='off'
								{...register("sku")}
								placeholder='Opcional'
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'>
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
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
							placeholder='Detalles, beneficios, formato, etc.'
						/>
						{errors.description && (
							<p className='text-xs text-red-500'>
								{errors.description.message}
							</p>
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
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							className='inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100'>
							Obtener recomendaciones
						</button>

						{showRecommendations && (
							<PriceTiers
								recommendation={recommendation}
								currency={watch("currency") ?? "NIO"}
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
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
					className='inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'>
					{isSubmitting || isPending ? "Guardando…" : submitLabel}
				</button>
			</div>
		</form>
	);
}
