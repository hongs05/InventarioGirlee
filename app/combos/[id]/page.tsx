import Link from "next/link";
import { notFound } from "next/navigation";

import { ComboForm } from "@/app/combos/_components/combo-form";
import { updateComboAction } from "@/app/combos/actions";
import type { ComboFormValues } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ComboRow = {
	id: string;
	name: string;
	description: string | null;
	status: string;
	packaging_cost: number;
	suggested_price: number | null;
	image_path: string | null;
	combo_items: Array<{
		product_id: string;
		qty: number;
		products: {
			name: string;
			cost_price: number;
		} | null;
	}>;
};

type ProductRow = {
	id: string;
	name: string;
	cost_price: number;
	status: string;
	categories: { name: string | null } | null;
};

export default async function EditComboPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();

	const [{ data: rawCombo }, { data: rawProducts }] = await Promise.all([
		supabase
			.from("combos")
			.select(
				"id, name, description, status, packaging_cost, suggested_price, image_path, combo_items(product_id, qty, products(name, cost_price))",
			)
			.eq("id", id)
			.maybeSingle(),
		supabase
			.from("products")
			.select("id, name, cost_price, status, categories(name)")
			.order("name", { ascending: true }),
	]);

	const combo = rawCombo as ComboRow | null;
	const products = rawProducts as ProductRow[] | null;

	if (!combo) {
		notFound();
	}

	const comboData = combo!;

	const defaultItems: ComboFormValues["items"] = (comboData.combo_items ?? [])
		.filter(
			(
				item,
			): item is ComboRow["combo_items"][number] & {
				products: NonNullable<ComboRow["combo_items"][number]["products"]>;
			} => Boolean(item.products),
		)
		.map((item) => ({
			productId: item.product_id,
			name: item.products.name,
			costPrice: Number(item.products.cost_price ?? 0),
			qty: item.qty,
		}));

	const productOptions = (products ?? []).map((product: ProductRow) => ({
		id: product.id,
		name: product.name,
		cost_price: Number(product.cost_price ?? 0),
		category: product.categories?.name ?? null,
	}));

	async function handleUpdate(formData: FormData) {
		"use server";
		formData.append("id", comboData.id);
		return updateComboAction(formData);
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='mb-6 flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-semibold text-gray-900'>
							Editar combo
						</h1>
						<p className='text-sm text-gray-500'>
							Actualiza los productos, costos y márgenes recomendados.
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
					submitAction={handleUpdate}
					submitLabel='Actualizar combo'
					heading={comboData.name}
					defaultValues={{
						name: comboData.name,
						description: comboData.description ?? undefined,
						packagingCost: Number(comboData.packaging_cost ?? 0),
						status: comboData.status as ComboFormValues["status"],
						items: defaultItems,
						suggestedPrice: comboData.suggested_price ?? undefined,
						imageUrl: comboData.image_path,
					}}
				/>
			</div>
		</div>
	);
}
