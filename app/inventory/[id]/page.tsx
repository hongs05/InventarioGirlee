import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/app/inventory/_components/product-form";
import { updateProductAction } from "@/app/inventory/actions";
import DashboardShell from "@/components/dashboard-shell";
import type { ProductFormValues } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function EditProductPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const [{ data: categories }, { data: product }] = await Promise.all([
		supabase
			.from("categories")
			.select("id, name")
			.order("name", { ascending: true }),
		supabase
			.from("products")
			.select(
				"id, name, sku, description, status, cost_price, sell_price, currency, category_id, image_path, quantity, meta",
			)
			.eq("id", id)
			.maybeSingle(),
	]);

	if (!product) {
		notFound();
	}

	const productMeta =
		product.meta &&
		typeof product.meta === "object" &&
		!Array.isArray(product.meta)
			? (product.meta as Record<string, unknown>)
			: null;
	const defaultBrand =
		productMeta && typeof productMeta.brand === "string"
			? (productMeta.brand as string)
			: undefined;

	async function handleUpdate(formData: FormData) {
		"use server";
		formData.append("id", product.id);
		return updateProductAction(formData);
	}

	return (
		<DashboardShell
			user={user}
			currentPath='/inventory'
			title='Editar producto'
			description='Actualiza costos, inventario y márgenes recomendados.'
			action={
				<Link
					href='/inventory'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
					Volver al inventario
				</Link>
			}>
			<div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
				<ProductForm
					categories={categories ?? []}
					submitAction={handleUpdate}
					submitLabel='Actualizar producto'
					heading={product.name}
					defaultValues={{
						name: product.name,
						brand: defaultBrand,
						sku: product.sku ?? undefined,
						description: product.description ?? undefined,
						categoryId: product.category_id
							? String(product.category_id)
							: undefined,
						costPrice: Number(product.cost_price ?? 0),
						sellPrice: product.sell_price ?? undefined,
						currency: product.currency ?? "NIO",
						status: (product.status as ProductFormValues["status"]) ?? "active",
						imageUrl: product.image_path,
						quantity: product.quantity ?? 0,
					}}
				/>
			</div>
		</DashboardShell>
	);
}
