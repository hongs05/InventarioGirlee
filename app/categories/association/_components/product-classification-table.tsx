"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type { ActionErrorRecord } from "@/lib/actions";

import { updateProductClassificationAction } from "../../actions";
import type { CategoryOption, ProductItem } from "../page";

type ProductClassificationTableProps = {
	categories: CategoryOption[];
	products: ProductItem[];
};

const STATUS_FILTERS = [
	{ value: "", label: "Todos" },
	{ value: "active", label: "Activos" },
	{ value: "draft", label: "Borradores" },
	{ value: "archived", label: "Archivados" },
];

export function ProductClassificationTable({
	categories,
	products,
}: ProductClassificationTableProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	const sortedProducts = useMemo(
		() =>
			[...products].sort((a, b) =>
				a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
			),
		[products],
	);

	const filteredProducts = useMemo(() => {
		const needle = searchTerm.trim().toLowerCase();

		return sortedProducts.filter((product) => {
			const matchesQuery =
				needle.length === 0 ||
				product.name.toLowerCase().includes(needle) ||
				(product.sku ?? "").toLowerCase().includes(needle);
			const matchesStatus =
				statusFilter.length === 0 || product.status === statusFilter;
			return matchesQuery && matchesStatus;
		});
	}, [searchTerm, statusFilter, sortedProducts]);

	return (
		<section className='space-y-4'>
			<header className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
				<div className='grid gap-4 md:grid-cols-4'>
					<label className='flex flex-col text-sm text-gray-700'>
						<span className='font-medium'>Buscar producto</span>
						<input
							type='search'
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder='Nombre o SKU'
							className='mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
					</label>
					<label className='flex flex-col text-sm text-gray-700'>
						<span className='font-medium'>Filtrar por estado</span>
						<select
							value={statusFilter}
							onChange={(event) => setStatusFilter(event.target.value)}
							className='mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
							{STATUS_FILTERS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
					<div className='rounded-lg border border-dashed border-blush-200 bg-blush-50 px-3 py-2 text-sm text-gray-600 md:col-span-2'>
						<p>
							Productos listados: <strong>{filteredProducts.length}</strong>
							de {products.length}
						</p>
					</div>
				</div>
			</header>

			<div className='overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm'>
				<table className='min-w-full divide-y divide-gray-200'>
					<thead className='bg-gray-50'>
						<tr>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500'>
								Producto
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500'>
								Clasificación
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500'>
								Estado / Stock
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-200'>
						{filteredProducts.length === 0 ? (
							<tr>
								<td
									colSpan={3}
									className='px-4 py-10 text-center text-sm text-gray-500'>
									No encontramos productos que coincidan con tu búsqueda.
								</td>
							</tr>
						) : (
							filteredProducts.map((product) => (
								<ProductClassificationRow
									key={`${product.id}-${product.categoryId ?? "none"}-${
										product.subcategoryId ?? "none"
									}`}
									product={product}
									categories={categories}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

type ProductClassificationRowProps = {
	product: ProductItem;
	categories: CategoryOption[];
};

type FeedbackState = {
	type: "success" | "error";
	message: string;
};

function ProductClassificationRow({
	product,
	categories,
}: ProductClassificationRowProps) {
	const initialCategory = product.categoryId ? String(product.categoryId) : "";
	const initialSubcategory = product.subcategoryId
		? String(product.subcategoryId)
		: "";

	const [categoryValue, setCategoryValue] = useState(initialCategory);
	const [subcategoryValue, setSubcategoryValue] = useState(initialSubcategory);
	const [savedValues, setSavedValues] = useState({
		category: initialCategory,
		subcategory: initialSubcategory,
	});
	const [fieldErrors, setFieldErrors] = useState<ActionErrorRecord | null>(
		null,
	);
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		return () => {
			if (feedbackTimeoutRef.current) {
				clearTimeout(feedbackTimeoutRef.current);
			}
		};
	}, []);

	const subcategoryOptions = useMemo(() => {
		const match = categories.find(
			(category) => String(category.id) === categoryValue,
		);
		return match?.subcategories ?? [];
	}, [categories, categoryValue]);

	const isDirty =
		categoryValue !== savedValues.category ||
		subcategoryValue !== savedValues.subcategory;

	const handleCategoryChange = (value: string) => {
		setCategoryValue(value);
		setFieldErrors(null);
		setFeedback(null);

		const nextSubcategories = categories.find(
			(category) => String(category.id) === value,
		)?.subcategories;

		if (!nextSubcategories) {
			setSubcategoryValue("");
			return;
		}

		const belongsToCategory = nextSubcategories.some(
			(subcategory) => String(subcategory.id) === subcategoryValue,
		);

		if (!belongsToCategory) {
			setSubcategoryValue("");
		}
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		setFieldErrors(null);
		setFeedback(null);

		startTransition(async () => {
			const result = await updateProductClassificationAction(formData);

			if (result.success) {
				const nextCategory = result.data.categoryId
					? String(result.data.categoryId)
					: "";
				const nextSubcategory = result.data.subcategoryId
					? String(result.data.subcategoryId)
					: "";

				setSavedValues({
					category: nextCategory,
					subcategory: nextSubcategory,
				});
				setCategoryValue(nextCategory);
				setSubcategoryValue(nextSubcategory);
				setFieldErrors(null);
				setTimedFeedback({
					type: "success",
					message: result.message ?? "Clasificación actualizada",
				});
			} else {
				setFieldErrors(result.errors);
				const message =
					result.errors.form?.[0] ??
					result.errors.categoryId?.[0] ??
					result.errors.subcategoryId?.[0] ??
					"No pudimos actualizar la clasificación";
				setTimedFeedback({ type: "error", message });
			}
		});
	};

	const setTimedFeedback = (state: FeedbackState) => {
		if (feedbackTimeoutRef.current) {
			clearTimeout(feedbackTimeoutRef.current);
		}
		setFeedback(state);
		feedbackTimeoutRef.current = setTimeout(() => {
			setFeedback(null);
			feedbackTimeoutRef.current = null;
		}, 4000);
	};

	const categoryError = fieldErrors?.categoryId?.[0];
	const subcategoryError = fieldErrors?.subcategoryId?.[0];

	return (
		<tr className={isPending ? "bg-blush-50/50" : ""}>
			<td className='px-4 py-4 align-top'>
				<div className='space-y-1'>
					<p className='text-sm font-semibold text-gray-900'>{product.name}</p>
					<p className='text-xs text-gray-500'>
						{product.sku ? `SKU: ${product.sku}` : "Sin SKU"}
					</p>
				</div>
			</td>
			<td className='px-4 py-4 align-top'>
				<form
					onSubmit={handleSubmit}
					className='flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4'>
					<input type='hidden' name='productId' value={product.id} />
					<div className='flex-1'>
						<label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
							Categoría
						</label>
						<select
							name='categoryId'
							value={categoryValue}
							onChange={(event) => handleCategoryChange(event.target.value)}
							className='mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
							<option value=''>Sin categoría</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
						{categoryError ? (
							<p className='mt-1 text-xs text-red-500'>{categoryError}</p>
						) : null}
					</div>
					<div className='flex-1'>
						<label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
							Subcategoría
						</label>
						{categoryValue.length === 0 || subcategoryOptions.length === 0 ? (
							<input
								type='hidden'
								name='subcategoryId'
								value={subcategoryValue}
							/>
						) : null}
						<select
							name='subcategoryId'
							value={subcategoryValue}
							onChange={(event) => {
								setSubcategoryValue(event.target.value);
								setFieldErrors(null);
								setFeedback(null);
							}}
							disabled={
								categoryValue.length === 0 || subcategoryOptions.length === 0
							}
							className='mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300 disabled:cursor-not-allowed disabled:bg-gray-100'>
							<option value=''>Sin subcategoría</option>
							{subcategoryOptions.map((subcategory) => (
								<option key={subcategory.id} value={subcategory.id}>
									{subcategory.name}
								</option>
							))}
						</select>
						{subcategoryError ? (
							<p className='mt-1 text-xs text-red-500'>{subcategoryError}</p>
						) : null}
					</div>
					<div className='flex items-end lg:items-center'>
						<button
							type='submit'
							disabled={!isDirty || isPending}
							className='inline-flex items-center rounded-md bg-blush-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:border disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'>
							{isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
				{feedback ? (
					<p
						className={`mt-2 text-xs ${
							feedback.type === "success" ? "text-blush-600" : "text-red-500"
						}`}>
						{feedback.message}
					</p>
				) : null}
			</td>
			<td className='px-4 py-4 align-top'>
				<div className='flex flex-col gap-2 text-xs text-gray-600'>
					<span className='font-medium'>
						Estado: {renderStatusLabel(product.status)}
					</span>
					<span>{renderQuantityBadge(product.quantity)}</span>
				</div>
			</td>
		</tr>
	);
}

function renderStatusLabel(status: string) {
	if (status === "active") {
		return "Activo";
	}
	if (status === "draft") {
		return "Borrador";
	}
	if (status === "archived") {
		return "Archivado";
	}
	return status;
}

function renderQuantityBadge(quantity: number | null) {
	const numericQuantity = Number.isFinite(quantity ?? NaN)
		? Number(quantity ?? 0)
		: 0;

	const baseClass =
		"inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-medium";

	if (numericQuantity <= 0) {
		return (
			<span className={`${baseClass} bg-gray-200 text-gray-600`}>
				Sin stock
			</span>
		);
	}

	if (numericQuantity <= 5) {
		return (
			<span className={`${baseClass} bg-amber-100 text-amber-700`}>
				{numericQuantity} en stock
			</span>
		);
	}

	return (
		<span className={`${baseClass} bg-blush-100 text-blush-600`}>
			{numericQuantity} en stock
		</span>
	);
}
