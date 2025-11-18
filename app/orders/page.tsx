import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
	pending: "Pendiente",
	processing: "En proceso",
	completed: "Completada",
	cancelled: "Cancelada",
};

const ATTENTION_STATUSES = new Set(["pending", "processing"]);

type OrderRow = {
	id: string;
	customer_name: string | null;
	status: string | null;
	receipt_number: string | null;
	payment_method: string | null;
	subtotal_amount: number | null;
	discount_amount: number | null;
	tax_amount: number | null;
	total_amount: number | null;
	total_cost: number | null;
	profit_amount: number | null;
	currency: string | null;
	created_at: string;
};

type OrderStats = {
	totalRevenue: number;
	totalProfit: number;
	todayRevenue: number;
	todayProfit: number;
};

function parseNumber(value: string | number | null | undefined) {
	if (value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export default async function OrdersPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const admin = createSupabaseAdminClient();
	const { data, error } = await admin
		.from("orders")
		.select(
			"id, receipt_number, customer_name, status, payment_method, subtotal_amount, discount_amount, tax_amount, total_amount, total_cost, profit_amount, currency, created_at",
		)
		.order("created_at", { ascending: false });

	const params = searchParams ? await searchParams : {};
	const orders = (data ?? []) as OrderRow[];
	const stats = calculateStats(orders);
	const currency = orders[0]?.currency ?? "NIO";
	const attentionCount = orders.filter((order) =>
		ATTENTION_STATUSES.has(order.status ?? ""),
	).length;
	const viewParam = Array.isArray(params?.view) ? params.view[0] : params?.view;
	const attentionOnly =
		typeof viewParam === "string" &&
		viewParam.toLowerCase() === "attention";
	const displayOrders = attentionOnly
		? orders.filter((order) => ATTENTION_STATUSES.has(order.status ?? ""))
		: orders;

	return (
		<DashboardShell
			user={user}
			currentPath='/orders'
			title='Órdenes'
			description='Consulta el historial de pedidos, verifica montos y márgenes por cada venta.'
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
				<div className='space-y-8'>
					<OrderStatsGrid stats={stats} currency={currency} />
					<AttentionCard
						count={attentionCount}
						attentionOnly={attentionOnly}
					/>
					<OrdersTable orders={displayOrders} />
				</div>
			)}
		</DashboardShell>
	);
}

function calculateStats(orders: OrderRow[]): OrderStats {
	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	return orders.reduce<OrderStats>(
		(acc, order) => {
			const total = parseNumber(order.total_amount);
			const profit =
				order.profit_amount !== null
					? parseNumber(order.profit_amount)
					: total - parseNumber(order.total_cost);

			acc.totalRevenue += total;
			acc.totalProfit += profit;

			const createdAt = new Date(order.created_at);
			if (createdAt >= startOfDay) {
				acc.todayRevenue += total;
				acc.todayProfit += profit;
			}

			return acc;
		},
		{ totalRevenue: 0, totalProfit: 0, todayRevenue: 0, todayProfit: 0 },
	);
}

function OrderStatsGrid({
	stats,
	currency,
}: {
	stats: OrderStats;
	currency: string;
}) {
	return (
		<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
			<StatCard
				title='Ingresos totales'
				value={formatCurrency(stats.totalRevenue, currency)}
				description='Suma de todas las órdenes registradas.'
			/>
			<StatCard
				title='Ganancias totales'
				value={formatCurrency(stats.totalProfit, currency)}
				description='Ingresos netos descontando costos.'
			/>
			<StatCard
				title='Ingresos de hoy'
				value={formatCurrency(stats.todayRevenue, currency)}
				description='Ventas registradas en la fecha actual.'
			/>
			<StatCard
				title='Ganancias de hoy'
				value={formatCurrency(stats.todayProfit, currency)}
				description='Ingresos netos del día.'
			/>
		</div>
	);
}

function StatCard({
	title,
	value,
	description,
}: {
	title: string;
	value: string;
	description: string;
}) {
	return (
		<div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
			<p className='text-sm font-medium text-gray-500'>{title}</p>
			<p className='mt-2 text-2xl font-semibold text-gray-900'>{value}</p>
			<p className='mt-1 text-xs text-gray-500'>{description}</p>
		</div>
	);
}

function AttentionCard({
	count,
	attentionOnly,
}: {
	count: number;
	attentionOnly: boolean;
}) {
	const alert =
		count === 0
			? "No hay órdenes pendientes."
			: count === 1
			? "1 orden requiere seguimiento."
			: `${count} órdenes requieren seguimiento.`;

	const href = attentionOnly ? "/orders" : "/orders?view=attention";
	const actionLabel = attentionOnly ? "Ver todas" : "Ver pendientes";

	return (
		<div className='flex flex-col gap-3 rounded-xl border border-blush-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
			<div>
				<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
					Atención
				</p>
				<p className='text-sm font-semibold text-gray-900'>{alert}</p>
			</div>
			<Link
				href={href}
				className='inline-flex items-center self-start rounded-full border border-blush-200 px-4 py-2 text-xs font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-50'>
				{actionLabel}
			</Link>
		</div>
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
			<table className='min-w-full divide-y divide-gray-200 text-sm'>
				<thead className='bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500'>
					<tr>
						<th className='px-4 py-3 text-left'>Cliente</th>
						<th className='px-4 py-3 text-left'>Estado</th>
						<th className='px-4 py-3 text-left'>Pago</th>
						<th className='px-4 py-3 text-left'>Subtotal</th>
						<th className='px-4 py-3 text-left'>Descuento</th>
						<th className='px-4 py-3 text-left'>Impuesto</th>
						<th className='px-4 py-3 text-left'>Total</th>
						<th className='px-4 py-3 text-left'>Ganancia</th>
						<th className='px-4 py-3 text-left'>Comprobante</th>
						<th className='px-4 py-3 text-left'>Creada</th>
						<th className='px-4 py-3 text-right'>Acciones</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200'>
					{orders.map((order) => {
						const currency = order.currency ?? "NIO";
						const needsAttention = ATTENTION_STATUSES.has(order.status ?? "");
						return (
							<tr
								key={order.id}
								className={`hover:bg-blush-50 ${
									needsAttention ? "border-l-4 border-l-blush-400" : ""
								}`}>
								<td className='px-4 py-4 font-medium text-gray-900'>
									{order.customer_name?.trim() || "Cliente sin nombre"}
								</td>
								<td className='px-4 py-4 text-gray-700'>
									<div className='flex flex-wrap items-center gap-2'>
										<OrderStatusBadge status={order.status} />
										{needsAttention ? (
											<span className='inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700'>
												Requiere atención
											</span>
										) : null}
									</div>
								</td>
								<td className='px-4 py-4 text-gray-700'>
									{formatPayment(order.payment_method)}
								</td>
								<td className='px-4 py-4 text-gray-700'>
									{formatCurrency(parseNumber(order.subtotal_amount), currency)}
								</td>
								<td className='px-4 py-4 text-gray-700'>
									{formatCurrency(parseNumber(order.discount_amount), currency)}
								</td>
								<td className='px-4 py-4 text-gray-700'>
									{formatCurrency(parseNumber(order.tax_amount), currency)}
								</td>
								<td className='px-4 py-4 text-gray-900'>
									{formatCurrency(parseNumber(order.total_amount), currency)}
								</td>
								<td className='px-4 py-4 text-gray-900'>
									{formatCurrency(
										order.profit_amount !== null
											? parseNumber(order.profit_amount)
											: parseNumber(order.total_amount) -
													parseNumber(order.total_cost),
										currency,
									)}
								</td>
								<td className='px-4 py-4 text-gray-700'>
									{order.receipt_number ? (
										<span className='inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600'>
											{order.receipt_number}
										</span>
									) : (
										<span className='text-xs text-gray-400'>
											Sin comprobante
										</span>
									)}
								</td>
								<td className='px-4 py-4 text-gray-500'>
									{formatDate(order.created_at)}
								</td>
								<td className='px-4 py-4 text-right'>
									<Link
										href={`/orders/${order.id}`}
										className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-blush-100'>
										Ver detalle
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

function formatPayment(method: string | null | undefined) {
	const normalized = (method ?? "cash").toLowerCase();
	const map: Record<string, string> = {
		cash: "Efectivo",
		card: "Tarjeta",
		transfer: "Transferencia",
	};

	return map[normalized] ?? normalized;
}
