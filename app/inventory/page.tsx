import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import DashboardShell from "@/components/dashboard-shell";
import { recommendPrice } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { DeleteProductButton } from "./_components/delete-product-button";
import { archiveProductAction } from "./actions";

const PRODUCT_STATUSES = [
	{ value: "", label: "Todos" },
	{ value: "active", label: "Activos" },
	{ value: "draft", label: "Borradores" },
	{ value: "archived", label: "Archivados" },
];

const LOW_STOCK_THRESHOLD = 5;

type SearchParams = {
	q?: string;
	status?: string;
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
	cost_price: number;
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
	const appliedStatus =
		rawStatus === undefined
			? "active"
			: allowedStatuses.has(rawStatus)
			? rawStatus
			: "active";
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

	if (appliedStatus) {
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
				<Link
					href='/inventory/new'
					className='inline-flex items-center justify-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
					Nuevo producto
				</Link>
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
					<InventoryTable products={products ?? []} />
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
			className='grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4'
			method='get'>
			<div className='md:col-span-2'>
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

			<div>
				<label htmlFor='status' className='text-sm font-medium text-gray-700'>
					Estado
				</label>
				<select
					id='status'
					name='status'
					defaultValue={statusValue}
					className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
					{PRODUCT_STATUSES.map((status) => (
						<option key={status.value} value={status.value}>
							{status.label}
						</option>
					))}
				</select>
			</div>

			<div>
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

			<div className='md:col-span-4 flex justify-end'>
				<button
					type='submit'
					className='inline-flex items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
					Aplicar filtros
				</button>
			</div>
		</form>
	);
}

async function InventoryTable({ products }: { products: ProductRow[] }) {
	if (!products.length) {
		return (
			<div className='rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm'>
				No se encontraron productos. Crea uno nuevo para empezar a construir tu
				inventario.
			</div>
		);
	}

	return (
		<div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th
							scope='col'
							className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Producto
						</th>
						<th
							scope='col'
							className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Costo
						</th>
						<th
							scope='col'
							className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Precio sugerido
						</th>
						<th
							scope='col'
							className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Inventario
						</th>
						<th
							scope='col'
							className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Estado
						</th>
						<th
							scope='col'
							className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200'>
					{products.map((product) => {
						const categoryName = product.categories?.name ?? undefined;
						const costPrice = Number(product.cost_price ?? 0);
						const recommendation =
							costPrice > 0
								? recommendPrice({
										costPrice,
										categoryName,
								  })
								: null;
						const imageSrc = resolveProductImageSrc(product.image_path);

						return (
							<tr key={product.id} className='hover:bg-gray-50'>
								<td className='px-4 py-4'>
									<div className='flex items-center gap-3'>
										<div className='relative h-12 w-12 overflow-hidden rounded-md border border-gray-200 bg-gray-100'>
											{imageSrc ? (
												<Image
													src={imageSrc}
													alt={product.name}
													fill
													className='object-cover'
												/>
											) : (
												<div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
													Sin imagen
												</div>
											)}
										</div>
										<div>
											<p className='text-sm font-medium text-gray-900'>
												{product.name}
											</p>
											<p className='text-xs text-gray-500'>
												{product.sku ? `SKU: ${product.sku}` : "Sin SKU"} ·{" "}
												{categoryName ?? "Sin categoría"}
											</p>
										</div>
									</div>
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									{formatCurrency(product.cost_price, product.currency)}
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									{recommendation
										? formatCurrency(recommendation.suggested, product.currency)
										: "Sin datos"}
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									{renderQuantityBadge(product.quantity)}
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									<StatusBadge status={product.status} />
								</td>
								<td className='px-4 py-4'>
									<div className='flex items-center justify-end gap-2'>
										<Link
											href={`/inventory/${product.id}`}
											className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100'>
											Editar
										</Link>
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
										<DeleteProductButton
											productId={product.id}
											productName={product.name}
										/>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const baseClass =
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
	if (status === "active") {
		return (
			<span className={`${baseClass} bg-blush-100 text-blush-600`}>Activo</span>
		);
	}
	if (status === "draft") {
		return (
			<span className={`${baseClass} bg-blush-200 text-blush-700`}>
				Borrador
			</span>
		);
	}
	return (
		<span className={`${baseClass} bg-gray-200 text-gray-600`}>Archivado</span>
	);
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
