import Link from "next/link";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function NewOrderPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	return (
		<DashboardShell
			user={user}
			currentPath='/orders'
			title='Registrar orden'
			description='Esta sección estará disponible próximamente.'
			action={
				<Link
					href='/orders'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100'>
					Volver a órdenes
				</Link>
			}>
			<div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600'>
				Estamos trabajando en el formulario para registrar nuevas órdenes. Muy
				pronto podrás capturar ventas y vincular inventario automáticamente.
			</div>
		</DashboardShell>
	);
}
