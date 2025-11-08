import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { ProductClassificationTable } from "./_components/product-classification-table";

type SubcategoryRow = {
	id: number;
	name: string | null;
};

type CategoryRow = {
	id: number;
	name: string | null;
	subcategories: SubcategoryRow[] | null;
};

type ProductRow = {
	id: string;
	name: string;
	sku: string | null;
	status: string | null;
	quantity: number | null;
	category_id: number | null;
	subcategory_id: number | null;
};

type CategoryOption = {
	id: number;
	name: string;
	subcategories: Array<{ id: number; name: string }>;
};

type ProductItem = {
	id: string;
	name: string;
	sku: string | null;
	status: string;
	quantity: number | null;
	categoryId: number | null;
	subcategoryId: number | null;
};

export default async function CategoryAssociationPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const [categoriesResponse, productsResponse] = await Promise.all([
		supabase
			.from("categories")
			.select("id, name, subcategories(id, name)")
			.order("name", { ascending: true })
			.order("name", { ascending: true, foreignTable: "subcategories" }),
		supabase
			.from("products")
			.select("id, name, sku, status, quantity, category_id, subcategory_id")
			.order("name", { ascending: true }),
	]);

	if (categoriesResponse.error) {
		console.error(
			"[categories/association] Failed to load categories",
			categoriesResponse.error,
		);
	}

	if (productsResponse.error) {
		console.error(
			"[categories/association] Failed to load products",
			productsResponse.error,
		);
	}

	const categories = normalizeCategories(categoriesResponse.data ?? []);
	const products = normalizeProducts(productsResponse.data ?? []);

	return (
		<DashboardShell
			user={user}
			currentPath='/categories/association'
			title='Clasificación por producto'
			description='Actualiza rápidamente la categoría y subcategoría de cada producto para mantener tu catálogo organizado.'
			action={
				<Link
					href='/categories'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
					Volver a categorías
				</Link>
			}>
			<section className='rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
				<header className='space-y-2'>
					<h2 className='text-lg font-semibold text-gray-900'>Cómo funciona</h2>
					<p className='text-sm text-gray-600'>
						Selecciona una categoría y, si aplica, una subcategoría para cada
						producto. Guarda los cambios por fila; el inventario se revalida de
						forma automática.
					</p>
				</header>
				<ul className='mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3'>
					<li className='rounded-lg border border-dashed border-blush-200 bg-blush-50 px-3 py-2'>
						<strong className='text-blush-600'>1.</strong> Busca productos por
						nombre o SKU.
					</li>
					<li className='rounded-lg border border-dashed border-blush-200 bg-blush-50 px-3 py-2'>
						<strong className='text-blush-600'>2.</strong> Cambia la categoría y
						selecciona una subcategoría compatible.
					</li>
					<li className='rounded-lg border border-dashed border-blush-200 bg-blush-50 px-3 py-2'>
						<strong className='text-blush-600'>3.</strong> Guarda cada fila para
						aplicar los cambios inmediatamente.
					</li>
				</ul>
			</section>

			<ProductClassificationTable categories={categories} products={products} />
		</DashboardShell>
	);
}

function normalizeCategories(rows: CategoryRow[]): CategoryOption[] {
	return rows
		.map((category) => ({
			id: category.id,
			name: category.name ?? "Sin nombre",
			subcategories: (category.subcategories ?? [])
				.filter((subcategory): subcategory is SubcategoryRow =>
					Boolean(subcategory),
				)
				.map((subcategory) => ({
					id: subcategory.id,
					name: subcategory.name ?? "Sin nombre",
				}))
				.sort((a, b) => a.name.localeCompare(b.name, "es")),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function normalizeProducts(rows: ProductRow[]): ProductItem[] {
	return rows.map((product) => ({
		id: product.id,
		name: product.name,
		sku: product.sku,
		status: product.status ?? "active",
		quantity:
			product.quantity === null || product.quantity === undefined
				? null
				: Number(product.quantity),
		categoryId: Number.isInteger(product.category_id)
			? Number(product.category_id)
			: null,
		subcategoryId: Number.isInteger(product.subcategory_id)
			? Number(product.subcategory_id)
			: null,
	}));
}

export type { CategoryOption, ProductItem };
