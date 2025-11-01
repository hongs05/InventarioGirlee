import Link from "next/link";

import { ProductForm } from "@/app/inventory/_components/product-form";
import { createProductAction } from "@/app/inventory/actions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NewProductPage() {
	const supabase = await createSupabaseServerClient();
	const { data: categories } = await supabase
		.from("categories")
		.select("id, name")
		.order("name", { ascending: true });

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='mb-6 flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-semibold text-gray-900'>
							Nuevo producto
						</h1>
						<p className='text-sm text-gray-500'>
							Registra productos con costos, imágenes y precios recomendados.
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
						submitAction={createProductAction}
						submitLabel='Guardar borrador'
						heading='Detalle del producto'
					/>
				</div>
			</div>
		</div>
	);
}
