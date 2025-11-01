import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductForm } from "@/app/inventory/_components/product-form";
import { createProductAction } from "@/app/inventory/actions";
import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NewProductPage() {
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

	return (
		<DashboardShell
			user={user}
			currentPath='/inventory'
			title='Nuevo producto'
			description='Registra productos con costos, imágenes y precios recomendados.'
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
					submitAction={createProductAction}
					submitLabel='Guardar borrador'
					heading='Detalle del producto'
				/>
			</div>
		</DashboardShell>
	);
}
