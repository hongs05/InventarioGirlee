import Link from "next/link";
import { redirect } from "next/navigation";

import { ComboForm } from "@/app/combos/_components/combo-form";
import { createComboAction } from "@/app/combos/actions";
import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProductRow = {
	id: string;
	name: string;
	cost_price: number;
	status: string;
	categories: { name: string | null } | null;
};

export default async function NewComboPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}
	const { data: products } = await supabase
		.from("products")
		.select("id, name, cost_price, status, categories(name)")
		.eq("status", "active")
		.order("name", { ascending: true });

	const productOptions = (products ?? []).map((product: ProductRow) => ({
		id: product.id,
		name: product.name,
		cost_price: Number(product.cost_price ?? 0),
		category: product.categories?.name ?? null,
	}));

	return (
		<DashboardShell
			user={user}
			currentPath='/combos'
			title='Nuevo combo'
			description='Combina productos y calcula precios recomendados de forma automática.'
			action={
				<Link
					href='/combos'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
					Ver combos
				</Link>
			}>
			<ComboForm
				products={productOptions}
				submitAction={createComboAction}
				submitLabel='Guardar borrador'
			/>
		</DashboardShell>
	);
}
