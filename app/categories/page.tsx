import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { CategoryForm } from "./_components/category-form";
import { SubcategoryForm } from "./_components/subcategory-form";

type SubcategoryRow = {
	id: number;
	name: string | null;
};

type CategoryRow = {
	id: number;
	name: string | null;
	subcategories: SubcategoryRow[] | null;
};

type CategoryWithChildren = {
	id: number;
	name: string;
	subcategories: Array<{ id: number; name: string }>;
};

export default async function CategoriesPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data, error } = await supabase
		.from("categories")
		.select("id, name, subcategories(id, name)")
		.order("name", { ascending: true })
		.order("name", { ascending: true, foreignTable: "subcategories" });

	if (error) {
		console.error("[categories] Failed to load categories", error);
	}

	const categories = normalizeCategories(data ?? []);
	const categoryOptions = categories.map((category) => ({
		id: category.id,
		name: category.name,
	}));

	return (
		<DashboardShell
			user={user}
			currentPath='/categories'
			title='Categorías'
			description='Crea y organiza categorías y subcategorías para clasificar tu catálogo.'>
			<section className='grid gap-6 lg:grid-cols-2'>
				<CategoryForm />
				<SubcategoryForm categories={categoryOptions} />
			</section>

			<CategoryList categories={categories} />
		</DashboardShell>
	);
}

function normalizeCategories(rows: CategoryRow[]): CategoryWithChildren[] {
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

type CategoryListProps = {
	categories: CategoryWithChildren[];
};

function CategoryList({ categories }: CategoryListProps) {
	if (categories.length === 0) {
		return (
			<section className='rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Aún no tienes categorías
				</h2>
				<p className='mt-2 text-sm text-gray-600'>
					Utiliza los formularios para crear tu primera categoría y
					subcategorías.
				</p>
			</section>
		);
	}

	return (
		<section className='space-y-6'>
			<header className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<h2 className='text-xl font-semibold text-gray-900'>
						Tus categorías
					</h2>
					<p className='text-sm text-gray-500'>
						Consulta las categorías existentes y las subcategorías asociadas.
					</p>
				</div>
				<span className='inline-flex items-center rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blush-600'>
					{categories.length} categorías
				</span>
			</header>

			<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
				{categories.map((category) => (
					<article
						key={category.id}
						className='flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
						<header className='mb-4 flex items-start justify-between gap-3'>
							<div>
								<h3 className='text-lg font-semibold text-gray-900'>
									{category.name}
								</h3>
								<p className='text-xs text-gray-500'>
									{category.subcategories.length} subcategorías
								</p>
							</div>
						</header>
						{category.subcategories.length ? (
							<ul className='flex-1 space-y-2'>
								{category.subcategories.map((subcategory) => (
									<li
										key={subcategory.id}
										className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700'>
										{subcategory.name}
									</li>
								))}
							</ul>
						) : (
							<p className='text-sm text-gray-500'>
								Sin subcategorías todavía. Agrega algunas para detallar esta
								familia.
							</p>
						)}
					</article>
				))}
			</div>
		</section>
	);
}
