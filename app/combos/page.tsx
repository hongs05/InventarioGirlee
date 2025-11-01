import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recommendPrice } from "@/lib/pricing";

const COMBO_STATUSES = [
	{ value: "", label: "Todos" },
	{ value: "active", label: "Activos" },
	{ value: "draft", label: "Borradores" },
	{ value: "archived", label: "Archivados" },
];

const dateFormatter = new Intl.DateTimeFormat("es-NI", {
	dateStyle: "medium",
	timeZone: "UTC",
});

type SearchParams = {
	status?: string;
};

type ComboRow = {
	id: string;
	name: string;
	description: string | null;
	status: string;
	packaging_cost: number;
	suggested_price: number | null;
	image_path: string | null;
	created_at: string;
	combo_items: Array<{
		qty: number;
		products: {
			cost_price: number;
		} | null;
	}>;
};

function formatDate(value: string) {
	return dateFormatter.format(new Date(value));
}

export default async function CombosPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const resolvedSearchParams = await searchParams;
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	let combosQuery = supabase
		.from("combos")
		.select(
			`id, name, description, status, packaging_cost, suggested_price, image_path, created_at,
			combo_items(qty, products(cost_price))`,
		)
		.order("created_at", { ascending: false });

	if (resolvedSearchParams?.status) {
		combosQuery = combosQuery.eq("status", resolvedSearchParams.status);
	}

	const { data: combos } = await combosQuery;

	return (
		<DashboardShell
			user={user}
			currentPath='/combos'
			title='Combos'
			description='Crea bundles rentables combinando tus mejores productos.'
			action={
				<Link
					href='/combos/new'
					className='inline-flex items-center justify-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
					Nuevo combo
				</Link>
			}>
			<form
				className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'
				method='get'>
				<label htmlFor='status' className='text-sm font-medium text-gray-700'>
					Estado
				</label>
				<select
					id='status'
					name='status'
					defaultValue={resolvedSearchParams.status ?? ""}
					className='w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
					{COMBO_STATUSES.map((status) => (
						<option key={status.value} value={status.value}>
							{status.label}
						</option>
					))}
				</select>
				<button
					type='submit'
					className='inline-flex items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
					Filtrar
				</button>
			</form>

			<CombosTable combos={combos ?? []} />
		</DashboardShell>
	);
}

function CombosTable({ combos }: { combos: ComboRow[] }) {
	if (!combos.length) {
		return (
			<div className='rounded-lg border border-blush-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm'>
				No hay combos registrados todavía. Crea uno nuevo para comenzar.
			</div>
		);
	}

	return (
		<div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Combo
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Packaging
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Precio sugerido
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Estado
						</th>
						<th className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200'>
					{combos.map((combo) => {
						const itemsCost = (combo.combo_items ?? []).reduce(
							(acc, item) =>
								acc +
								Number(item.products?.cost_price ?? 0) * Number(item.qty ?? 0),
							0,
						);
						const packaging = Number(combo.packaging_cost ?? 0);
						const totalCost = packaging + itemsCost;
						const suggested =
							combo.suggested_price ??
							recommendPrice({ costPrice: totalCost }).suggested;

						return (
							<tr key={combo.id} className='hover:bg-gray-50'>
								<td className='px-4 py-4'>
									<div className='flex items-center gap-3'>
										<div className='relative h-12 w-12 overflow-hidden rounded-md border border-gray-200 bg-gray-100'>
											{combo.image_path ? (
												<Image
													src={combo.image_path}
													alt={combo.name}
													fill
													className='object-cover'
												/>
											) : (
												<div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
													Sin imagen
												</div>
											)}
										</div>
										<div>
											<p className='text-sm font-medium text-gray-900'>
												{combo.name}
											</p>
											<p className='text-xs text-gray-500'>
												Creado el{" "}
												{formatDate(combo.created_at)}
											</p>
										</div>
									</div>
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									{formatCurrency(combo.packaging_cost)}
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									{formatCurrency(suggested)}
								</td>
								<td className='px-4 py-4 text-sm text-gray-700'>
									<StatusBadge status={combo.status} />
								</td>
								<td className='px-4 py-4 text-right text-sm'>
									<Link
										href={`/combos/${combo.id}`}
										className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-blush-50'>
										Editar
									</Link>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const baseClass =
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
	if (status === "active") {
		return (
			<span className={`${baseClass} bg-blush-100 text-blush-600`}>Activo</span>
		);
	}
	if (status === "draft") {
		return (
			<span className={`${baseClass} bg-blush-200 text-blush-700`}>Borrador</span>
		);
	}
	return (
		<span className={`${baseClass} bg-gray-200 text-gray-600`}>Archivado</span>
	);
}

function formatCurrency(value: number | null | undefined, currency = "NIO") {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}
