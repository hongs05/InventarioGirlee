import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/app/inventory/_components/product-form";
import { updateProductAction } from "@/app/inventory/actions";
import type { ProductFormValues } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function EditProductPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();

	const [{ data: categories }, { data: product }] = await Promise.all([
		supabase
			.from("categories")
			.select("id, name")
			.order("name", { ascending: true }),
		supabase
			.from("products")
			.select(
				"id, name, sku, description, status, cost_price, sell_price, currency, category_id, image_path",
			)
			.eq("id", id)
			.maybeSingle(),
	]);

	if (!product) {
		notFound();
	}

	async function handleUpdate(formData: FormData) {
		"use server";
		formData.append("id", product.id);
		return updateProductAction(formData);
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='mb-6 flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-semibold text-gray-900'>
							Editar producto
						</h1>
						<p className='text-sm text-gray-500'>
							Actualiza costos, inventario y márgenes recomendados.
						</p>
					</div>
					<Link
						href='/inventory'
						className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
						Volver al inventario
					</Link>
				</div>

				<div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<ProductForm
						categories={categories ?? []}
						submitAction={handleUpdate}
						submitLabel='Actualizar producto'
						heading={product.name}
						defaultValues={{
							name: product.name,
							sku: product.sku ?? undefined,
							description: product.description ?? undefined,
							categoryId: product.category_id
								? String(product.category_id)
								: undefined,
							costPrice: Number(product.cost_price ?? 0),
							sellPrice: product.sell_price ?? undefined,
							currency: product.currency ?? "NIO",
							status:
								(product.status as ProductFormValues["status"]) ?? "active",
							imageUrl: product.image_path,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
