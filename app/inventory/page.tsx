import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import DashboardShell from "@/components/dashboard-shell";
import { recommendPrice } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { DeleteProductButton } from "./_components/delete-product-button";
import { ExportCatalogButton } from "./_components/export-catalog-button";
import { activateProductAction, archiveProductAction } from "./actions";

const LOW_STOCK_THRESHOLD = 5;

const PRODUCT_STATUSES = [
	{ value: "active", label: "Activos" },
	{ value: "archived", label: "Archivados / Eliminados" },
	{ value: "draft", label: "Borradores" },
	{ value: "deleted", label: "Eliminados" },
	{ value: "all", label: "Todos" },
] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number]["value"];

type SearchParams = {
	q?: string;
	status?: ProductStatus;
	category?: string;
};

type CategoryRow = {
	id: number;
	name: string;
};

type ProductRow = {
	id: string;
	sku: string | null;
	name: string;
	status: string;
	cost_price: number | null;
	sell_price: number | null;
	currency: string;
	image_path: string | null;
	created_at: string;
	category_id: number | null;
	quantity: number | null;
	categories: { name: string | null } | null;
};

export default async function InventoryPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const resolvedSearchParams = await searchParams;
	const allowedStatuses = new Set(
		PRODUCT_STATUSES.map((status) => status.value),
	);
	const rawStatus = resolvedSearchParams?.status;
	const appliedStatus: ProductStatus =
		rawStatus && allowedStatuses.has(rawStatus) ? rawStatus : "active";
	const appliedCategory =
		resolvedSearchParams?.category === undefined
			? ""
			: resolvedSearchParams.category;
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: categories } = await supabase
		.from("categories")
		.select("id, name")
		.order("name", { ascending: true });

	let productsQuery = supabase
		.from("products")
		.select(
			"id, sku, name, status, cost_price, sell_price, currency, image_path, created_at, category_id, quantity, categories(name)",
		)
		.order("created_at", { ascending: false });

	if (appliedStatus !== "all") {
		productsQuery = productsQuery.eq("status", appliedStatus);
	}

	if (appliedCategory) {
		productsQuery = productsQuery.eq("category_id", Number(appliedCategory));
	}

	if (resolvedSearchParams?.q) {
		const term = `%${resolvedSearchParams.q}%`;
		productsQuery = productsQuery.or(`name.ilike.${term},sku.ilike.${term}`);
	}

	const { data: products } = await productsQuery;
	const normalizedSearchParams: SearchParams = {
		q: resolvedSearchParams?.q,
		status: appliedStatus,
		category: appliedCategory,
	};

	return (
		<DashboardShell
			user={user}
			currentPath='/inventory'
			title='Inventario'
			description='Gestiona productos, categorías y precios recomendados desde una sola vista.'
			action={
				<div className='flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3'>
					<ExportCatalogButton />
					<Link
						href='/inventory/new'
						className='inline-flex items-center justify-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
						Nuevo producto
					</Link>
				</div>
			}>
			<Suspense
				fallback={
					<div className='rounded-lg border border-gray-200 bg-white p-6'>
						Cargando…
					</div>
				}>
				<div className='flex flex-col gap-6'>
					<InventoryFilters
						categories={categories ?? []}
						searchParams={normalizedSearchParams}
					/>
					<InventoryGrid products={products ?? []} status={appliedStatus} />
				</div>
			</Suspense>
		</DashboardShell>
	);
}

async function InventoryFilters({
	categories,
	searchParams,
}: {
	categories: CategoryRow[];
	searchParams: SearchParams;
}) {
	const statusValue = searchParams.status ?? "active";
	const categoryValue = searchParams.category ?? "";
	return (
		<form
			className='grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4 md:items-end'
			method='get'>
			<div className='flex flex-col gap-1 md:col-span-2'>
				<label htmlFor='q' className='text-sm font-medium text-gray-700'>
					Buscar
				</label>
				<input
					id='q'
					name='q'
					type='search'
					placeholder='Nombre, SKU…'
					defaultValue={searchParams.q ?? ""}
					className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
				/>
			</div>

			<div className='flex flex-col gap-1'>
				<label htmlFor='status' className='text-sm font-medium text-gray-700'>
					Estado
				</label>
				<select
					id='status'
					name='status'
					defaultValue={statusValue}
					className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
					{PRODUCT_STATUSES.map((statusOption) => (
						<option key={statusOption.value} value={statusOption.value}>
							{statusOption.label}
						</option>
					))}
				</select>
			</div>

			<div className='flex flex-col gap-1'>
				<label htmlFor='category' className='text-sm font-medium text-gray-700'>
					Categoría
				</label>
				<select
					id='category'
					name='category'
					defaultValue={categoryValue}
					className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
					<option value=''>Todas</option>
					{categories.map((category) => (
						<option key={category.id} value={category.id}>
							{category.name}
						</option>
					))}
				</select>
			</div>

			<div className='flex justify-end'>
				<button
					type='submit'
					className='inline-flex items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
					Aplicar filtros
				</button>
			</div>
		</form>
	);
}

async function InventoryGrid({
	products,
	status,
}: {
	products: ProductRow[];
	status: ProductStatus;
}) {
	if (!products.length) {
		const emptyMessages: Record<ProductStatus, string> = {
			active:
				"No se encontraron productos activos. Crea uno nuevo para empezar a construir tu inventario.",
			archived:
				"No tienes productos archivados o eliminados. Archiva un producto para verlo aquí.",
			draft:
				"No se encontraron borradores. Guarda un producto como borrador para verlo en esta vista.",
			deleted: "No se encontraron productos marcados como eliminados.",
			all: "No se encontraron productos que coincidan con los filtros seleccionados.",
		};

		return (
			<div className='rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm'>
				{emptyMessages[status]}
			</div>
		);
	}

	return (
		<div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
			{products.map((product) => {
				const categoryName = product.categories?.name ?? undefined;
				const hasCostPrice = typeof product.cost_price === "number";
				const hasSellPrice = typeof product.sell_price === "number";
				const costPrice = hasCostPrice ? Number(product.cost_price) : 0;
				const sellPrice = hasSellPrice ? Number(product.sell_price) : 0;
				const recommendation =
					hasCostPrice && costPrice > 0
						? recommendPrice({
								costPrice,
								categoryName,
						  })
						: null;
				const unitEarnings =
					hasCostPrice && hasSellPrice ? sellPrice - costPrice : null;
				const earningsPositive =
					unitEarnings !== null ? unitEarnings >= 0 : true;
				const imageSrc = resolveProductImageSrc(product.image_path);
				const canActivate = product.status === "archived";
				const canArchive =
					product.status === "active" || product.status === "draft";

				return (
					<div
						key={product.id}
						className='flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'>
						<div className='relative aspect-4/3 w-full overflow-hidden border-b border-gray-200 bg-gray-100'>
							{imageSrc ? (
								<Image
									src={imageSrc}
									alt={product.name}
									fill
									sizes='(min-width: 1280px) 320px, (min-width: 768px) 40vw, 100vw'
									className='object-cover'
								/>
							) : (
								<div className='absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-400'>
									Sin imagen
								</div>
							)}
						</div>
						<div className='flex flex-1 flex-col gap-4 p-4'>
							<div className='flex items-start justify-between gap-3'>
								<div className='min-w-0'>
									<p className='truncate text-base font-semibold text-gray-900'>
										{product.name}
									</p>
									<p className='text-xs text-gray-500'>
										{product.sku ? `SKU: ${product.sku}` : "Sin SKU"} ·{" "}
										{categoryName ?? "Sin categoría"}
									</p>
								</div>
								<StatusBadge status={product.status} />
							</div>

							<div className='grid gap-3 text-sm text-gray-700 sm:grid-cols-2'>
								<div>
									<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
										Costo
									</p>
									<p className='mt-1'>
										{hasCostPrice ? (
											formatCurrency(costPrice, product.currency)
										) : (
											<span className='text-gray-400'>—</span>
										)}
									</p>
								</div>
								<div>
									<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
										Precio de venta
									</p>
									<p className='mt-1'>
										{hasSellPrice ? (
											formatCurrency(sellPrice, product.currency)
										) : (
											<span className='text-gray-400'>
												Sin precio asignado
												{recommendation
													? ` · Sugerido ${formatCurrency(
															recommendation.suggested,
															product.currency,
													  )}`
													: ""}
											</span>
										)}
									</p>
								</div>
								<div>
									<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
										Ganancia unitaria
									</p>
									<p className='mt-1'>
										{unitEarnings !== null ? (
											<span
												className={
													earningsPositive
														? "font-medium text-emerald-600"
														: "font-medium text-red-600"
												}>
												{formatCurrency(unitEarnings, product.currency)}
											</span>
										) : (
											<span className='text-gray-400'>—</span>
										)}
									</p>
								</div>
								<div>
									<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
										Inventario
									</p>
									<div className='mt-1'>
										{renderQuantityBadge(product.quantity)}
									</div>
								</div>
							</div>

							<div className='mt-auto flex flex-wrap items-center justify-between gap-2 pt-2'>
								<Link
									href={`/inventory/${product.id}`}
									className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100'>
									Editar
								</Link>
								<div className='flex items-center gap-2'>
									{canActivate ? (
										<form
											action={async () => {
												"use server";
												await activateProductAction(product.id);
											}}>
											<button
												type='submit'
												className='inline-flex items-center rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50'>
												Activar
											</button>
										</form>
									) : null}
									{canArchive ? (
										<form
											action={async () => {
												"use server";
												await archiveProductAction(product.id);
											}}>
											<button
												type='submit'
												className='inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50'>
												Archivar
											</button>
										</form>
									) : null}
									<DeleteProductButton
										productId={product.id}
										productName={product.name}
									/>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const baseClass =
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

	switch (status) {
		case "active":
			return (
				<span className={`${baseClass} bg-blush-100 text-blush-600`}>
					Activo
				</span>
			);
		case "draft":
			return (
				<span className={`${baseClass} bg-blush-200 text-blush-700`}>
					Borrador
				</span>
			);
		case "archived":
			return (
				<span className={`${baseClass} bg-gray-200 text-gray-600`}>
					Archivado
				</span>
			);
		case "deleted":
			return (
				<span className={`${baseClass} bg-gray-300 text-gray-700`}>
					Eliminado
				</span>
			);
		default:
			return (
				<span className={`${baseClass} bg-gray-200 text-gray-600`}>
					{status}
				</span>
			);
	}
}

function resolveProductImageSrc(
	imagePath: string | null | undefined,
): string | null {
	if (!imagePath) {
		return null;
	}

	const trimmed = imagePath.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	if (trimmed.startsWith("data:")) {
		return trimmed;
	}

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	return null;
}

function renderQuantityBadge(quantity: number | null | undefined) {
	const numericQuantity = Number.isFinite(quantity ?? NaN)
		? Number(quantity ?? 0)
		: 0;
	const formatted = formatQuantity(numericQuantity);
	const baseClass =
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

	if (numericQuantity <= 0) {
		return (
			<span className={`${baseClass} bg-gray-200 text-gray-600`}>
				{formatted}
			</span>
		);
	}

	if (numericQuantity <= LOW_STOCK_THRESHOLD) {
		return (
			<span className={`${baseClass} bg-amber-100 text-amber-700`}>
				{formatted}
			</span>
		);
	}

	return (
		<span className={`${baseClass} bg-emerald-100 text-emerald-700`}>
			{formatted}
		</span>
	);
}

function formatCurrency(value: number, currency = "NIO") {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function formatQuantity(quantity: number | null | undefined) {
	const value = Number.isFinite(quantity ?? NaN) ? quantity ?? 0 : 0;
	const formatted = new Intl.NumberFormat("es-NI").format(value);
	const label = value === 1 ? "unidad" : "unidades";
	return `${formatted} ${label}`;
}
