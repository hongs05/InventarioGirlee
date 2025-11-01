import Link from "next/link";
import Image from "next/image";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recommendPrice } from "@/lib/pricing";

const COMBO_STATUSES = [
	{ value: "", label: "Todos" },
	{ value: "active", label: "Activos" },
	{ value: "draft", label: "Borradores" },
	{ value: "archived", label: "Archivados" },
];

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
};

export default async function CombosPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const resolvedSearchParams = await searchParams;
	const supabase = await createSupabaseServerClient();

	let combosQuery = supabase
		.from("combos")
		.select(
			"id, name, description, status, packaging_cost, suggested_price, image_path, created_at",
		)
		.order("created_at", { ascending: false });

	if (resolvedSearchParams?.status) {
		combosQuery = combosQuery.eq("status", resolvedSearchParams.status);
	}

	const { data: combos } = await combosQuery;

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8'>
				<div className='flex flex-col gap-6'>
					<header className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
						<div>
							<h1 className='text-3xl font-semibold text-gray-900'>Combos</h1>
							<p className='text-sm text-gray-500'>
								Crea bundles rentables combinando tus mejores productos.
							</p>
						</div>
						<Link
							href='/combos/new'
							className='inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700'>
							Nuevo combo
						</Link>
					</header>

					<form
						className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'
						method='get'>
						<label
							htmlFor='status'
							className='text-sm font-medium text-gray-700'>
							Estado
						</label>
						<select
							id='status'
							name='status'
							defaultValue={resolvedSearchParams.status ?? ""}
							className='w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'>
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
				</div>
			</div>
		</div>
	);
}

function CombosTable({ combos }: { combos: ComboRow[] }) {
	if (!combos.length) {
		return (
			<div className='rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm'>
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
						const suggested =
							combo.suggested_price ??
							recommendPrice({ costPrice: Number(combo.packaging_cost ?? 0) })
								.suggested;

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
												{new Date(combo.created_at).toLocaleDateString(
													"es-NI",
													{ dateStyle: "medium" },
												)}
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
										className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100'>
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
			<span className={`${baseClass} bg-emerald-100 text-emerald-700`}>
				Activo
			</span>
		);
	}
	if (status === "draft") {
		return (
			<span className={`${baseClass} bg-amber-100 text-amber-700`}>
				Borrador
			</span>
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
