"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { ComboSummary } from "@/components/ComboSummary";
import type { ComboSummaryItem } from "@/components/ComboSummary";
import { PriceTiers } from "@/components/PriceTiers";
import { UploadImage } from "@/components/UploadImage";
import type { ActionErrorRecord, ActionResult } from "@/lib/actions";
import {
	recommendPrice,
	type PriceRecommendation,
	type PriceRule,
} from "@/lib/pricing";
import {
	normalizeRule,
	selectBestRule,
	type ProductPricingMetric,
} from "@/lib/pricing-rules";
import {
	ComboFormValues,
	comboFormSchema,
	comboStatusEnum,
	ComboItemInput,
} from "@/lib/schemas";

export type ComboProductOption = {
	id: string;
	name: string;
	cost_price: number;
	categoryId?: string | null;
	categoryName?: string | null;
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
	pricingRules?: PriceRule[];
	productMetrics?: ProductPricingMetric[];
};

const statusOptions = comboStatusEnum.options;

export function ComboForm({
	products,
	defaultValues,
	submitAction,
	submitLabel = "Guardar combo",
	heading = "Nuevo combo",
	pricingRules = [],
	productMetrics = [],
}: ComboFormProps) {
	const [serverErrors, setServerErrors] = useState<ActionErrorRecord | null>(
		null,
	);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [searchTerm, setSearchTerm] = useState("");
	const [imageKey, setImageKey] = useState(0);
	const isEditing = Boolean(defaultValues?.id);

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
			promoTag: defaultValues?.promoTag,
		},
	});

	const { register, handleSubmit, setValue, reset, control, formState } = form;
	const suggestedPriceValue = useWatch({ control, name: "suggestedPrice" });
	const {
		append,
		update,
		remove: removeItem,
	} = useFieldArray({
		control,
		name: "items",
	});
	const productsById = useMemo(
		() => new Map(products.map((product) => [product.id, product])),
		[products],
	);
	const rawItems = useWatch({ control, name: "items" }) as
		| ComboItemInput[]
		| undefined;
	const watchedItems = useMemo(() => rawItems ?? [], [rawItems]);
	const comboItems = useMemo<ComboSummaryItem[]>(() => {
		return watchedItems
			.map((item) => {
				if (!item?.productId) {
					return null;
				}
				const product = productsById.get(item.productId);
				const qty = Math.max(1, Number(item.qty ?? 1));
				const costPrice = Number(item.costPrice ?? product?.cost_price ?? 0);
				return {
					id: item.productId,
					name: item.name ?? product?.name ?? "Producto",
					qty,
					costPrice,
				};
			})
			.filter((item): item is ComboSummaryItem => Boolean(item?.id));
	}, [watchedItems, productsById]);
	const normalizedRules = useMemo(
		() => pricingRules.map((rule) => normalizeRule(rule)),
		[pricingRules],
	);
	const metricsByProductId = useMemo(() => {
		const map = new Map<string, ProductPricingMetric>();
		productMetrics.forEach((metric) => {
			if (metric?.productId) {
				map.set(metric.productId, metric);
			}
		});
		return map;
	}, [productMetrics]);
	const promoTagValue = useWatch({ control, name: "promoTag" });
	const inventoryAges = useMemo(() => {
		return comboItems
			.map((item) => metricsByProductId.get(item.id)?.inventoryAgeDays ?? null)
			.filter(
				(value): value is number =>
					typeof value === "number" && Number.isFinite(value),
			);
	}, [comboItems, metricsByProductId]);
	const costChanges = useMemo(() => {
		return comboItems
			.map((item) => metricsByProductId.get(item.id)?.costChangePct ?? null)
			.filter(
				(value): value is number =>
					typeof value === "number" && Number.isFinite(value),
			);
	}, [comboItems, metricsByProductId]);
	const comboCategories = useMemo(() => {
		const registry = new Map<
			string,
			{ id: string | null; name: string | null }
		>();
		comboItems.forEach((item) => {
			const product = productsById.get(item.id);
			const categoryId = product?.categoryId ?? null;
			const categoryName = product?.categoryName ?? null;
			const key = (categoryId ?? categoryName ?? item.id).toLowerCase();
			if (!registry.has(key)) {
				registry.set(key, { id: categoryId, name: categoryName });
			}
		});
		return Array.from(registry.values());
	}, [comboItems, productsById]);
	const comboContext = useMemo(
		() => ({
			categories: comboCategories,
			promoTag: promoTagValue ? String(promoTagValue) : null,
			inventoryAges,
			costChanges,
		}),
		[comboCategories, promoTagValue, inventoryAges, costChanges],
	);
	const appliedRule = useMemo(() => {
		if (!comboItems.length || !normalizedRules.length) {
			return null;
		}
		return selectBestRule(normalizedRules, comboContext);
	}, [comboItems.length, normalizedRules, comboContext]);
	const primaryCategoryName = comboCategories.length
		? comboCategories[0]?.name ?? null
		: null;

	useEffect(() => {
		register("imageFile");
	}, [register]);

	const packagingCost = useWatch({ control, name: "packagingCost" }) ?? 0;
	const currency = "NIO";
	const nameErrorId = formState.errors.name ? "combo-name-error" : undefined;
	const descriptionErrorId = formState.errors.description
		? "combo-description-error"
		: undefined;
	const packagingErrorId = formState.errors.packagingCost
		? "combo-packaging-error"
		: undefined;
	const statusErrorId = formState.errors.status
		? "combo-status-error"
		: undefined;
	const promoTagErrorId = formState.errors.promoTag
		? "combo-promo-error"
		: undefined;

	const filteredProducts = useMemo(() => {
		if (!searchTerm) return products;
		const value = searchTerm.toLowerCase();
		return products.filter((product) =>
			product.name.toLowerCase().includes(value),
		);
	}, [products, searchTerm]);

	const totals = useMemo(() => {
		const itemsCost = comboItems.reduce(
			(acc, item) => acc + item.costPrice * item.qty,
			0,
		);
		return {
			itemsCost,
			totalCost: itemsCost + (Number(packagingCost) || 0),
		};
	}, [comboItems, packagingCost]);

	const recommendation = useMemo(() => {
		if (totals.totalCost <= 0) return null;
		return recommendPrice({
			costPrice: totals.totalCost,
			categoryName: primaryCategoryName ?? undefined,
			rule: appliedRule,
		});
	}, [totals.totalCost, primaryCategoryName, appliedRule]);

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
		formData.append("status", values.status ?? "active");
		if (values.suggestedPrice !== undefined) {
			formData.append("suggestedPrice", String(values.suggestedPrice));
		}
		if (values.promoTag) {
			formData.append("promoTag", values.promoTag);
		}

		if (values.imageFile instanceof File) {
			formData.append("imageFile", values.imageFile);
		}

		const payload = comboItems.map((item) => ({
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
					promoTag: undefined,
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

		const existingIndex = watchedItems.findIndex(
			(item) => item.productId === productId,
		);

		if (existingIndex >= 0) {
			const current = watchedItems[existingIndex];
			if (current) {
				const nextQty = Math.max(1, Number(current.qty ?? 0) + 1);
				update(existingIndex, {
					...current,
					qty: nextQty,
				});
			}
			return;
		}

		append({
			productId: product.id,
			name: product.name,
			costPrice: product.cost_price,
			qty: 1,
		});
	}

	function handleQtyChange(productId: string, qty: number) {
		const sanitizedQty = Math.max(0, Number.isFinite(qty) ? qty : 0);
		const index = watchedItems.findIndex(
			(item) => item.productId === productId,
		);
		if (index === -1) return;

		if (sanitizedQty <= 0) {
			removeItem(index);
			return;
		}

		const current = watchedItems[index];
		if (!current) return;

		update(index, {
			...current,
			qty: sanitizedQty,
		});
	}

	function handleRemoveProduct(productId: string) {
		const index = watchedItems.findIndex(
			(item) => item.productId === productId,
		);
		if (index === -1) return;
		removeItem(index);
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
					<div
						role='status'
						aria-live='polite'
						className='rounded-md border border-blush-200 bg-blush-50 px-4 py-3 text-sm text-blush-700'>
						{successMessage}
					</div>
				)}

				{serverErrors?.form && (
					<div
						role='alert'
						aria-live='assertive'
						className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
						{serverErrors.form.join(" ")}
					</div>
				)}

				<div className='space-y-2'>
					<label
						htmlFor='promoTag'
						className='text-sm font-medium text-gray-700'>
						Etiqueta de promoción
					</label>
					<input
						id='promoTag'
						type='text'
						{...register("promoTag")}
						aria-invalid={!!formState.errors.promoTag}
						aria-describedby={promoTagErrorId}
						placeholder='Ej. verano-2025, liquidación, etc.'
						className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					{formState.errors.promoTag && (
						<p id={promoTagErrorId} className='text-xs text-red-500'>
							{formState.errors.promoTag.message}
						</p>
					)}
					<p className='text-xs text-gray-500'>
						Opcional. Usa una etiqueta consistente para activar reglas de
						pricing durante campañas o promociones.
					</p>
				</div>

				<div className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='space-y-2'>
						<label htmlFor='name' className='text-sm font-medium text-gray-700'>
							Nombre del combo
						</label>
						<input
							id='name'
							type='text'
							{...register("name")}
							aria-invalid={!!formState.errors.name}
							aria-describedby={nameErrorId}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						{formState.errors.name && (
							<p id={nameErrorId} className='text-xs text-red-500'>
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
							aria-invalid={!!formState.errors.description}
							aria-describedby={descriptionErrorId}
							className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							placeholder='Detalles del combo, beneficios, packaging, etc.'
						/>
						{formState.errors.description && (
							<p id={descriptionErrorId} className='text-xs text-red-500'>
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
								aria-invalid={!!formState.errors.packagingCost}
								aria-describedby={packagingErrorId}
								className='block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{formState.errors.packagingCost && (
								<p id={packagingErrorId} className='text-xs text-red-500'>
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
								aria-invalid={!!formState.errors.status}
								aria-describedby={statusErrorId}
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
								<p id={statusErrorId} className='text-xs text-red-500'>
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
					{!comboItems.length && (
						<div className='rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500'>
							Agrega productos desde la lista de la izquierda.
						</div>
					)}

					<div className='space-y-3'>
						{comboItems.map((item) => (
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
					items={comboItems}
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
