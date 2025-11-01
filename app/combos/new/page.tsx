import Link from "next/link";

import { ComboForm } from "@/app/combos/_components/combo-form";
import { createComboAction } from "@/app/combos/actions";
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
		<div className='min-h-screen bg-gray-50'>
			<div className='mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='mb-6 flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-semibold text-gray-900'>
							Nuevo combo
						</h1>
						<p className='text-sm text-gray-500'>
							Combina productos y calcula precios recomendados de forma
							automática.
						</p>
					</div>
					<Link
						href='/combos'
						className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
						Ver combos
					</Link>
				</div>

				<ComboForm
					products={productOptions}
					submitAction={createComboAction}
					submitLabel='Guardar borrador'
				/>
			</div>
		</div>
	);
}
