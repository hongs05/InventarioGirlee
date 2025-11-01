import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const STATUS_LABELS: Record<string, string> = {
	pending: "Pendiente",
	processing: "En proceso",
	completed: "Completada",
	cancelled: "Cancelada",
};

type OrderRow = {
	id: string;
	customer_name: string | null;
	status: string | null;
	total_amount: number | null;
	currency: string | null;
	created_at: string;
};

export default async function OrdersPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data, error } = await supabase
		.from("orders")
		.select("id, customer_name, status, total_amount, currency, created_at")
		.order("created_at", { ascending: false });

	const orders = (data ?? []) as OrderRow[];

	return (
		<DashboardShell
			user={user}
			currentPath='/orders'
			title='Órdenes'
			description='Consulta el historial de pedidos y su estado actual.'
			action={
				<Link
					href='/orders/new'
					className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
					Nueva orden
				</Link>
			}>
			{error ? (
				<div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
					No pudimos cargar las órdenes. Verifica que la tabla{" "}
					<code>orders</code>
					exista en Supabase y vuelve a intentarlo.
				</div>
			) : (
				<OrdersTable orders={orders} />
			)}
		</DashboardShell>
	);
}

function OrdersTable({ orders }: { orders: OrderRow[] }) {
	if (!orders.length) {
		return (
			<div className='rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm'>
				Aún no se registran órdenes.
			</div>
		);
	}

	return (
		<div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Cliente
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Estado
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Total
						</th>
						<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Creada
						</th>
						<th className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200'>
					{orders.map((order) => (
						<tr key={order.id} className='hover:bg-blush-50'>
							<td className='px-4 py-4 text-sm text-gray-900'>
								{order.customer_name ?? "Cliente sin nombre"}
							</td>
							<td className='px-4 py-4 text-sm text-gray-700'>
								<OrderStatusBadge status={order.status} />
							</td>
							<td className='px-4 py-4 text-sm text-gray-700'>
								{formatCurrency(
									order.total_amount ?? 0,
									order.currency ?? "NIO",
								)}
							</td>
							<td className='px-4 py-4 text-sm text-gray-500'>
								{formatDate(order.created_at)}
							</td>
							<td className='px-4 py-4 text-right text-sm'>
								<Link
									href={`/orders/${order.id}`}
									className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-blush-100'>
									Ver detalle
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function OrderStatusBadge({ status }: { status: string | null }) {
	const label = status ? STATUS_LABELS[status] ?? status : "Sin estado";
	const normalized = status ?? "unknown";

	const styleMap: Record<string, string> = {
		pending: "bg-blush-100 text-blush-600",
		processing: "bg-blush-50 text-blush-500",
		completed: "bg-blush-500 text-white",
		cancelled: "bg-blush-200 text-blush-700",
		unknown: "bg-gray-200 text-gray-600",
	};

	const styles = styleMap[normalized] ?? styleMap.unknown;

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
			{label}
		</span>
	);
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function formatDate(raw: string) {
	try {
		return new Intl.DateTimeFormat("es-NI", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "UTC",
		}).format(new Date(raw));
	} catch {
		return raw;
	}
}
