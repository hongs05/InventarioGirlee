import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ComboForm } from "@/app/combos/_components/combo-form";
import { updateComboAction } from "@/app/combos/actions";
import DashboardShell from "@/components/dashboard-shell";
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
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

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

	const comboData = combo;

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
			name: item.products!.name,
			costPrice: Number(item.products!.cost_price ?? 0),
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
		<DashboardShell
			user={user}
			currentPath='/combos'
			title='Editar combo'
			description='Actualiza los productos, costos y márgenes recomendados.'
			action={
				<Link
					href='/combos'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
					Ver combos
				</Link>
			}>
			<ComboForm
				products={productOptions}
				submitAction={handleUpdate}
				submitLabel='Actualizar combo'
				heading={comboData.name}
				defaultValues={{
					name: comboData.name,
					description: comboData.description ?? undefined,
					packagingCost: Number(comboData.packaging_cost ?? 0),
					suggestedPrice: comboData.suggested_price ?? undefined,
					status: comboData.status as ComboFormValues["status"],
					imageUrl: comboData.image_path ?? undefined,
					items: defaultItems,
				}}
			/>
		</DashboardShell>
	);
}
