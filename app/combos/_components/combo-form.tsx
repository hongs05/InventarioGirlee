"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UploadImage } from "@/components/UploadImage";
import { ComboSummary } from "@/components/ComboSummary";
import type { ComboSummaryItem } from "@/components/ComboSummary";
import { PriceTiers } from "@/components/PriceTiers";
import { recommendPrice, type PriceRecommendation } from "@/lib/pricing";
import {
	ComboFormValues,
	comboFormSchema,
	comboStatusEnum,
	ComboItemInput,
} from "@/lib/schemas";
import type { ActionErrorRecord, ActionResult } from "@/lib/actions";

export type ComboProductOption = {
	id: string;
	name: string;
	cost_price: number;
	category?: string | null;
};

type ComboFormProps = {
	products: ComboProductOption[];
	defaultValues?: Partial<ComboFormValues> & {
		id?: string;
		imageUrl?: string | null;
	};
	submitAction: (formData: FormData) => Promise<ActionResult<unknown>>;
	submitLabel?: string;
	heading?: string;
};

const statusOptions = comboStatusEnum.options;

export function ComboForm({
	products,
	defaultValues,
	submitAction,
	submitLabel = "Guardar combo",
	heading = "Nuevo combo",
}: ComboFormProps) {
	const [serverErrors, setServerErrors] = useState<ActionErrorRecord | null>(
		null,
	);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [searchTerm, setSearchTerm] = useState("");
	const [imageKey, setImageKey] = useState(0);
	const isEditing = Boolean(defaultValues?.id);
	const [selectedItems, setSelectedItems] = useState<ComboSummaryItem[]>(
		(defaultValues?.items ?? []).map((item) => ({
			id: item.productId,
			name: item.name,
			qty: item.qty,
			costPrice: item.costPrice,
		})),
	);

	const form = useForm<ComboFormValues>({
		resolver: zodResolver(comboFormSchema),
		defaultValues: {
			name: defaultValues?.name ?? "",
			description: defaultValues?.description,
			packagingCost: defaultValues?.packagingCost ?? 0,
			status: defaultValues?.status ?? "active",
			items: defaultValues?.items ?? [],
			imageFile: undefined,
			suggestedPrice: defaultValues?.suggestedPrice,
		},
	});

	const { register, handleSubmit, watch, setValue, reset, formState } = form;
	const suggestedPriceValue = watch("suggestedPrice");

	useEffect(() => {
		register("imageFile");
		register("items");
	}, [register]);

	useEffect(() => {
		setValue(
			"items",
			selectedItems.map<ComboItemInput>((item) => ({
				productId: item.id,
				name: item.name,
				costPrice: item.costPrice,
				qty: item.qty,
			})),
			{ shouldDirty: true, shouldValidate: true },
		);
	}, [selectedItems, setValue]);

	const packagingCost = watch("packagingCost") ?? 0;
	const status = watch("status") ?? "active";
	const currency = "NIO";

	const productsById = useMemo(
		() => new Map(products.map((product) => [product.id, product])),
		[products],
	);

	const filteredProducts = useMemo(() => {
		if (!searchTerm) return products;
		const value = searchTerm.toLowerCase();
		return products.filter((product) =>
			product.name.toLowerCase().includes(value),
		);
	}, [products, searchTerm]);

	const totals = useMemo(() => {
		const itemsCost = selectedItems.reduce(
			(acc, item) => acc + item.costPrice * item.qty,
			0,
		);
		return {
			itemsCost,
			totalCost: itemsCost + (Number(packagingCost) || 0),
		};
	}, [selectedItems, packagingCost]);

const recommendation = useMemo(() => {
	if (totals.totalCost <= 0) return null;
	return recommendPrice({ costPrice: totals.totalCost });
}, [totals.totalCost]);

const handleTierSelect = useCallback(
	(_tier: PriceRecommendation["appliedTier"], value: number) => {
		setValue("suggestedPrice", Number(value.toFixed(2)), {
			shouldDirty: true,
			shouldValidate: true,
		});
	},
	[setValue],
);

useEffect(() => {
	if (
		recommendation &&
		!formState.dirtyFields?.suggestedPrice &&
		recommendation.suggested !== undefined
	) {
		setValue("suggestedPrice", Number(recommendation.suggested.toFixed(2)), {
			shouldDirty: false,
		});
	}
}, [formState.dirtyFields?.suggestedPrice, recommendation, setValue]);

	const onSubmit = handleSubmit((values) => {
		const formData = new FormData();
		formData.append("name", values.name);
		if (values.description) formData.append("description", values.description);
		formData.append("packagingCost", String(values.packagingCost ?? 0));
		formData.append("status", status);
		if (values.suggestedPrice !== undefined) {
			formData.append("suggestedPrice", String(values.suggestedPrice));
		}

		if (values.imageFile instanceof File) {
			formData.append("imageFile", values.imageFile);
		}

		const payload = selectedItems.map((item) => ({
			productId: item.id,
			name: item.name,
			costPrice: item.costPrice,
			qty: item.qty,
		}));

		formData.append("items", JSON.stringify(payload));

		setServerErrors(null);
		setSuccessMessage(null);

		startTransition(async () => {
			const result = await submitAction(formData);
			if (!result.success) {
				setServerErrors(result.errors);
				return;
			}

			setSuccessMessage(result.message ?? "Combo listo para guardar");
			if (!isEditing) {
				setSelectedItems([]);
				setSearchTerm("");
				setImageKey((prev) => prev + 1);
				reset({
					name: "",
					description: undefined,
					packagingCost: 0,
					status: "active",
					items: [],
					imageFile: undefined,
					suggestedPrice: undefined,
				});
			}
		});
	});

	const formatter = useMemo(
		() => new Intl.NumberFormat("es-NI", { style: "currency", currency }),
		[currency],
	);

	function handleAddProduct(productId: string) {
		const product = productsById.get(productId);
		if (!product) return;

		setSelectedItems((prev) => {
			const existing = prev.find((item) => item.id === productId);
			if (existing) {
				return prev.map((item) =>
					item.id === productId ? { ...item, qty: item.qty + 1 } : item,
				);
			}

			return [
				...prev,
				{
					id: product.id,
					name: product.name,
					qty: 1,
					costPrice: product.cost_price,
				},
			];
		});
	}

	function handleQtyChange(productId: string, qty: number) {
		setSelectedItems((prev) =>
			prev
				.map((item) => (item.id === productId ? { ...item, qty } : item))
				.filter((item) => item.qty > 0),
		);
	}

	function handleRemoveProduct(productId: string) {
		setSelectedItems((prev) => prev.filter((item) => item.id !== productId));
	}

	return (
		<form
			onSubmit={onSubmit}
			className='grid gap-8 md:grid-cols-[2fr,1fr]'
			encType='multipart/form-data'>
			<div className='space-y-6'>
				<div className='space-y-2'>
					<h2 className='text-xl font-semibold text-gray-900'>{heading}</h2>
					<p className='text-sm text-gray-500'>
						Construye combos con tus productos y obtén precios sugeridos
						automáticamente.
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

				<div className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='space-y-2'>
						<label htmlFor='name' className='text-sm font-medium text-gray-700'>
							Nombre del combo
						</label>
						<input
							id='name'
							type='text'
							{...register("name")}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						{formState.errors.name && (
							<p className='text-xs text-red-500'>
								{formState.errors.name.message}
							</p>
						)}
					</div>

					<div className='space-y-2'>
						<label
							htmlFor='description'
							className='text-sm font-medium text-gray-700'>
							Descripción
						</label>
						<textarea
							id='description'
							rows={3}
							{...register("description")}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							placeholder='Detalles del combo, beneficios, packaging, etc.'
						/>
						{formState.errors.description && (
							<p className='text-xs text-red-500'>
								{formState.errors.description.message}
							</p>
						)}
					</div>

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<label
								htmlFor='packagingCost'
								className='text-sm font-medium text-gray-700'>
								Costo de empaque
							</label>
							<input
								id='packagingCost'
								type='number'
								step='0.01'
								min={0}
								{...register("packagingCost", { valueAsNumber: true })}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{formState.errors.packagingCost && (
								<p className='text-xs text-red-500'>
									{formState.errors.packagingCost.message}
								</p>
							)}
						</div>
						<div className='space-y-2'>
							<label
								htmlFor='status'
								className='text-sm font-medium text-gray-700'>
								Estado
							</label>
							<select
								id='status'
								{...register("status")}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
								{statusOptions.map((statusValue) => (
									<option key={statusValue} value={statusValue}>
										{statusValue === "active"
											? "Activo"
											: statusValue === "draft"
											? "Borrador"
											: "Archivado"}
									</option>
								))}
							</select>
							{formState.errors.status && (
								<p className='text-xs text-red-500'>
									{formState.errors.status.message}
								</p>
							)}
						</div>
					</div>
				</div>

				<div className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<div>
							<h3 className='text-lg font-semibold text-gray-900'>
								Productos disponibles
							</h3>
							<p className='text-sm text-gray-500'>
								Añade productos a la derecha para construir el combo.
							</p>
						</div>
						<input
							type='search'
							placeholder='Buscar producto'
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300 sm:w-64'
						/>
					</div>

					<div className='grid gap-3 md:grid-cols-2'>
						{filteredProducts.map((product) => (
							<button
								key={product.id}
								type='button'
								onClick={() => handleAddProduct(product.id)}
								className='flex flex-col rounded-md border border-gray-200 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'>
								<span className='text-sm font-medium text-gray-900'>
									{product.name}
								</span>
								<span className='text-xs text-gray-500'>
									Costo: {formatter.format(product.cost_price)}
								</span>
							</button>
						))}

						{!filteredProducts.length && (
							<div className='rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500'>
								No hay productos disponibles. Crea productos en el inventario
								primero.
							</div>
						)}
					</div>
				</div>

				<div className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<h3 className='text-lg font-semibold text-gray-900'>
						Productos en el combo
					</h3>
					{!selectedItems.length && (
						<div className='rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500'>
							Agrega productos desde la lista de la izquierda.
						</div>
					)}

					<div className='space-y-3'>
						{selectedItems.map((item) => (
							<div
								key={item.id}
								className='flex items-center justify-between rounded-md border border-gray-200 p-3'>
								<div>
									<p className='text-sm font-medium text-gray-900'>
										{item.name}
									</p>
									<p className='text-xs text-gray-500'>
										Costo unitario: {formatter.format(item.costPrice)} ·
										Subtotal: {formatter.format(item.costPrice * item.qty)}
									</p>
								</div>
								<div className='flex items-center gap-2'>
									<input
										type='number'
										min={1}
										value={item.qty}
										onChange={(event) =>
											handleQtyChange(item.id, Number(event.target.value) || 1)
										}
										className='h-9 w-16 rounded-md border border-gray-300 px-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
									/>
									<button
										type='button'
										onClick={() => handleRemoveProduct(item.id)}
										className='inline-flex items-center rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50'>
										Quitar
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className='space-y-6'>
				<UploadImage
					key={imageKey}
					name='imageFile'
					label='Imagen del combo'
					defaultPreview={defaultValues?.imageUrl ?? null}
					helperText='Opcional. Se recomienda 1200x800px'
					onFileChange={(file) =>
						setValue("imageFile", file ?? undefined, { shouldDirty: true })
					}
				/>

				<ComboSummary
					items={selectedItems}
					packagingCost={Number(packagingCost) || 0}
					suggestedPrice={
						typeof suggestedPriceValue === "number"
							? suggestedPriceValue
							: recommendation?.suggested ?? undefined
					}
					currency={currency}
				/>

				<div className='space-y-3'>
					<h3 className='text-sm font-semibold text-gray-900'>
						Recomendaciones de precio
					</h3>
					<PriceTiers
						recommendation={recommendation}
						currency={currency}
						onSelectTier={handleTierSelect}
					/>
				</div>

				<div className='flex items-center justify-end'>
					<button
						type='submit'
						disabled={isPending || formState.isSubmitting}
						className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:opacity-60'>
						{isPending || formState.isSubmitting ? "Guardando…" : submitLabel}
					</button>
				</div>
			</div>
		</form>
	);
}
