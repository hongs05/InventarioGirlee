import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const numberFormatter = new Intl.NumberFormat("es-NI");
const currencyFormatter = new Intl.NumberFormat("es-NI", {
	style: "currency",
	currency: "NIO",
});
const salesDateFormatter = new Intl.DateTimeFormat("es-NI", {
	weekday: "short",
	day: "numeric",
	month: "short",
});
const dateTimeFormatter = new Intl.DateTimeFormat("es-NI", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

type ActivityRow = {
	id: string;
	name: string;
	created_at: string;
};

type LowStockRow = {
	id: string;
	name: string;
	quantity: number;
};

type SalesTrendPoint = {
	saleDate: string;
	totalAmount: number;
	profitAmount: number;
	orderCount: number;
};

type OrderSnapshotRow = {
	created_at: string | null;
	total_amount: number | string | null;
	profit_amount: number | string | null;
};

export default async function DashboardPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	let productCount = 0;
	let comboCount = 0;
	let categoryCount = 0;
	let ordersLast30 = 0;
	let revenueLast30 = 0;
	let profitLast30 = 0;
	let inventoryUnits = 0;
	let inventoryValue = 0;
	let lowStockItems: LowStockRow[] = [];
	let salesTrendPoints: SalesTrendPoint[] = [];
	let recentProductItems: ActivityRow[] = [];
	let recentComboItems: ActivityRow[] = [];

	const { data: overviewData, error } = await supabase.rpc(
		"dashboard_overview",
	);

	const missingFunctionError = Boolean(
		error?.code === "PGRST202" ||
			error?.message
				?.toLowerCase()
				.includes("could not find the function public.dashboard_overview"),
	);

	if (!error && overviewData?.length) {
		const overview = overviewData[0] as Record<string, unknown>;
		productCount = Math.round(safeNumber(overview.product_count));
		comboCount = Math.round(safeNumber(overview.combo_count));
		categoryCount = Math.round(safeNumber(overview.category_count));
		ordersLast30 = Math.round(safeNumber(overview.orders_last_30));
		revenueLast30 = safeNumber(overview.revenue_last_30);
		profitLast30 = safeNumber(overview.profit_last_30);
		inventoryUnits = safeNumber(overview.inventory_units);
		inventoryValue = safeNumber(overview.inventory_value);
		lowStockItems = ensureArray<Record<string, unknown>>(
			overview.low_stock_products,
		)
			.map((item) => ({
				id: String(item.id ?? ""),
				name: String(item.name ?? "Producto sin nombre"),
				quantity: Math.max(0, safeNumber(item.quantity)),
			}))
			.filter((item) => item.id);
		salesTrendPoints = ensureArray<Record<string, unknown>>(
			overview.sales_last_7,
		)
			.map((point) => ({
				saleDate: typeof point.sale_date === "string" ? point.sale_date : "",
				totalAmount: safeNumber(point.total_amount),
				profitAmount: safeNumber(point.profit_amount),
				orderCount: Math.max(0, Math.round(safeNumber(point.order_count))),
			}))
			.filter((point) => point.saleDate)
			.sort((a, b) => a.saleDate.localeCompare(b.saleDate));
		recentProductItems = ensureArray<ActivityRow>(
			overview.recent_products as ActivityRow[],
		);
		recentComboItems = ensureArray<ActivityRow>(
			overview.recent_combos as ActivityRow[],
		);
	} else if (missingFunctionError) {
		const now = new Date();
		const thirtyDaysAgoISO = new Date(
			now.getTime() - 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		const [
			productStats,
			comboStats,
			categoryStats,
			recentProducts,
			recentCombos,
			ordersSnapshot,
			productSnapshot,
		] = await Promise.all([
			supabase.from("products").select("id", { count: "exact", head: true }),
			supabase.from("combos").select("id", { count: "exact", head: true }),
			supabase.from("categories").select("id", { count: "exact", head: true }),
			supabase
				.from("products")
				.select("id, name, created_at")
				.order("created_at", { ascending: false })
				.limit(5),
			supabase
				.from("combos")
				.select("id, name, created_at")
				.order("created_at", { ascending: false })
				.limit(5),
			supabase
				.from("orders")
				.select("created_at, total_amount, profit_amount")
				.eq("status", "completed")
				.gte("created_at", thirtyDaysAgoISO)
				.limit(1000),
			supabase
				.from("products")
				.select("id, name, quantity, cost_price, status")
				.limit(500),
		]);

		productCount = productStats.count ?? 0;
		comboCount = comboStats.count ?? 0;
		categoryCount = categoryStats.count ?? 0;
		recentProductItems = ensureArray<ActivityRow>(
			(recentProducts.data ?? []) as ActivityRow[],
		);
		recentComboItems = ensureArray<ActivityRow>(
			(recentCombos.data ?? []) as ActivityRow[],
		);

		const orderRows = ensureArray<OrderSnapshotRow>(
			(ordersSnapshot.data ?? []) as OrderSnapshotRow[],
		);
		salesTrendPoints = buildWeeklyTrendFromOrders(orderRows);
		ordersLast30 = orderRows.length;
		revenueLast30 = orderRows.reduce(
			(total, row) => total + safeNumber(row.total_amount),
			0,
		);
		profitLast30 = orderRows.reduce(
			(total, row) => total + safeNumber(row.profit_amount),
			0,
		);

		const inventoryRows = ensureArray<Record<string, unknown>>(
			(productSnapshot.data ?? []) as Record<string, unknown>[],
		);
		inventoryUnits = inventoryRows.reduce((sum, product) => {
			const qty = Math.max(0, safeNumber(product.quantity));
			return sum + qty;
		}, 0);
		inventoryValue = inventoryRows.reduce((sum, product) => {
			const qty = Math.max(0, safeNumber(product.quantity));
			return sum + qty * safeNumber(product.cost_price);
		}, 0);
		lowStockItems = inventoryRows
			.filter((product) => {
				const status = String(product.status ?? "active");
				const qty = safeNumber(product.quantity);
				return status === "active" && Number.isFinite(qty) && qty <= 5;
			})
			.sort((a, b) => {
				const qtyDiff = safeNumber(a.quantity) - safeNumber(b.quantity);
				if (qtyDiff !== 0) {
					return qtyDiff;
				}
				return String(a.name ?? "").localeCompare(String(b.name ?? ""));
			})
			.slice(0, 5)
			.map((product) => ({
				id: String(product.id ?? ""),
				name: String(product.name ?? "Producto sin nombre"),
				quantity: Math.max(0, safeNumber(product.quantity)),
			}))
			.filter((item) => item.id);
	} else if (error) {
		throw new Error(error.message);
	}

	if (salesTrendPoints.length === 0) {
		salesTrendPoints = buildEmptyWeeklyTrend();
	}

	const marginRate =
		revenueLast30 > 0 ? (profitLast30 / revenueLast30) * 100 : 0;
	const averageTicket = ordersLast30 > 0 ? revenueLast30 / ordersLast30 : 0;
	const weeklyRevenue = salesTrendPoints.reduce(
		(total, point) => total + point.totalAmount,
		0,
	);
	const weeklyProfit = salesTrendPoints.reduce(
		(total, point) => total + point.profitAmount,
		0,
	);
	const weeklyOrders = salesTrendPoints.reduce(
		(total, point) => total + point.orderCount,
		0,
	);
	const weeklyAverageTicket =
		weeklyOrders > 0 ? weeklyRevenue / weeklyOrders : 0;

	return (
		<DashboardShell
			user={user}
			currentPath='/dashboard'
			title='Panel general'
			description='Monitoriza tu inventario, combos y categorías de un vistazo.'>
			<section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
				<StatCard
					title='Ventas últimos 30 días'
					value={revenueLast30}
					variant='currency'
					helperText='Ingresos netos de pedidos completados.'
					footnote={`Ticket promedio: ${currencyFormatter.format(
						averageTicket,
					)}`}
				/>
				<StatCard
					title='Margen últimos 30 días'
					value={profitLast30}
					variant='currency'
					helperText='Utilidad registrada en pedidos completados.'
					footnote={`Margen efectivo: ${marginRate.toFixed(1)}%`}
				/>
				<StatCard
					title='Pedidos completados'
					value={ordersLast30}
					variant='number'
					helperText='Pedidos cerrados durante los últimos 30 días.'
				/>
				<StatCard
					title='Valor de inventario'
					value={inventoryValue}
					variant='currency'
					helperText='Basado en costo promedio con existencias activas.'
					footnote={`${numberFormatter.format(
						Math.round(inventoryUnits),
					)} unidades disponibles`}
				/>
			</section>

			<section className='grid gap-6 xl:grid-cols-[2fr,1fr]'>
				<SalesTrendCard
					data={salesTrendPoints}
					summary={{
						weeklyRevenue,
						weeklyProfit,
						weeklyOrders,
						averageTicket: weeklyAverageTicket,
					}}
				/>
				<InventorySnapshotCard
					productCount={productCount}
					comboCount={comboCount}
					categoryCount={categoryCount}
					inventoryUnits={inventoryUnits}
					lowStockCount={lowStockItems.length}
				/>
			</section>

			<section className='grid gap-6 lg:grid-cols-2 xl:grid-cols-3'>
				<ActivityList
					title='Últimos productos'
					emptyLabel='Aún no registras productos.'
					items={recentProductItems.map((product) => ({
						href: `/inventory/${product.id}`,
						label: product.name,
						subLabel: dateTimeFormatter.format(new Date(product.created_at)),
					}))}
				/>
				<ActivityList
					title='Últimos combos'
					emptyLabel='Aún no registras combos.'
					items={recentComboItems.map((combo) => ({
						href: `/combos/${combo.id}`,
						label: combo.name,
						subLabel: dateTimeFormatter.format(new Date(combo.created_at)),
					}))}
				/>
				<LowStockList items={lowStockItems} />
			</section>
		</DashboardShell>
	);
}

function StatCard({
	title,
	value,
	variant = "number",
	helperText,
	footnote,
}: {
	title: string;
	value: number;
	variant?: "number" | "currency" | "percentage";
	helperText?: string;
	footnote?: string;
}) {
	let displayValue: string;
	if (variant === "currency") {
		displayValue = currencyFormatter.format(value);
	} else if (variant === "percentage") {
		displayValue = `${value.toFixed(1)}%`;
	} else {
		displayValue = numberFormatter.format(Math.round(value));
	}

	return (
		<div className='rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
			<p className='text-sm font-medium text-blush-500'>{title}</p>
			<p className='mt-2 text-3xl font-semibold text-gray-900'>
				{displayValue}
			</p>
			{helperText ? (
				<p className='mt-2 text-xs text-gray-500'>{helperText}</p>
			) : null}
			{footnote ? (
				<p className='mt-3 text-xs font-semibold text-blush-600'>{footnote}</p>
			) : null}
		</div>
	);
}

function ActivityList({
	title,
	emptyLabel,
	items,
}: {
	title: string;
	emptyLabel: string;
	items: Array<{ href: string; label: string; subLabel: string }>;
}) {
	return (
		<div className='rounded-xl border border-blush-200 bg-white shadow-sm'>
			<div className='border-b border-blush-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
			</div>
			{items.length ? (
				<ul className='divide-y divide-gray-200'>
					{items.map((item) => (
						<li key={item.href} className='px-6 py-4'>
							<Link
								href={item.href}
								className='flex flex-col text-sm transition hover:text-blush-600'>
								<span className='font-medium text-gray-900'>{item.label}</span>
								<span className='text-xs text-gray-500'>{item.subLabel}</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className='px-6 py-8 text-sm text-gray-500'>{emptyLabel}</p>
			)}
		</div>
	);
}

function SalesTrendCard({
	data,
	summary,
}: {
	data: SalesTrendPoint[];
	summary: {
		weeklyRevenue: number;
		weeklyProfit: number;
		weeklyOrders: number;
		averageTicket: number;
	};
}) {
	const maxTotal = Math.max(...data.map((point) => point.totalAmount || 0), 1);

	return (
		<div className='rounded-xl border border-blush-200 bg-white shadow-sm'>
			<div className='border-b border-blush-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Ritmo de ventas (7 días)
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Sigue el comportamiento diario de tus ventas recientes.
				</p>
			</div>
			<div className='space-y-6 px-6 py-5'>
				<div className='grid gap-4 rounded-lg border border-blush-100 bg-blush-50/60 p-4 text-sm text-gray-700 sm:grid-cols-3'>
					<div>
						<p className='text-xs uppercase tracking-wide text-gray-500'>
							Ventas semana
						</p>
						<p className='mt-1 font-semibold text-gray-900'>
							{currencyFormatter.format(summary.weeklyRevenue)}
						</p>
					</div>
					<div>
						<p className='text-xs uppercase tracking-wide text-gray-500'>
							Margen semana
						</p>
						<p className='mt-1 font-semibold text-gray-900'>
							{currencyFormatter.format(summary.weeklyProfit)}
						</p>
					</div>
					<div>
						<p className='text-xs uppercase tracking-wide text-gray-500'>
							Ticket promedio
						</p>
						<p className='mt-1 font-semibold text-gray-900'>
							{currencyFormatter.format(summary.averageTicket)}
						</p>
						<p className='text-xs text-gray-500'>
							{numberFormatter.format(summary.weeklyOrders)} pedidos
						</p>
					</div>
				</div>

				<ul className='space-y-4'>
					{data.map((point) => {
						const displayDate = salesDateFormatter.format(
							new Date(`${point.saleDate}T00:00:00Z`),
						);
						const barWidth = `${Math.max(
							Math.round((point.totalAmount / maxTotal) * 100),
							4,
						)}%`;
						return (
							<li key={point.saleDate} className='space-y-2'>
								<div className='flex items-center justify-between text-sm font-medium text-gray-900'>
									<span>{displayDate}</span>
									<span>{currencyFormatter.format(point.totalAmount)}</span>
								</div>
								<div className='h-2 w-full rounded-full bg-blush-100'>
									<div
										className='h-2 rounded-full bg-blush-400'
										style={{ width: barWidth }}
									/>
								</div>
								<p className='text-xs text-gray-500'>
									{numberFormatter.format(point.orderCount)} pedidos · margen{" "}
									{currencyFormatter.format(point.profitAmount)}
								</p>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

function InventorySnapshotCard({
	productCount,
	comboCount,
	categoryCount,
	inventoryUnits,
	lowStockCount,
}: {
	productCount: number;
	comboCount: number;
	categoryCount: number;
	inventoryUnits: number;
	lowStockCount: number;
}) {
	return (
		<div className='flex h-full flex-col justify-between rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
			<div>
				<h2 className='text-lg font-semibold text-gray-900'>
					Inventario a la mano
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Resumen de catálogo y existencias activas.
				</p>
			</div>
			<ul className='mt-6 space-y-3 text-sm text-gray-700'>
				<li className='flex items-center justify-between'>
					<span>Productos activos</span>
					<span className='font-semibold text-gray-900'>
						{numberFormatter.format(productCount)}
					</span>
				</li>
				<li className='flex items-center justify-between'>
					<span>Combos publicados</span>
					<span className='font-semibold text-gray-900'>
						{numberFormatter.format(comboCount)}
					</span>
				</li>
				<li className='flex items-center justify-between'>
					<span>Categorías</span>
					<span className='font-semibold text-gray-900'>
						{numberFormatter.format(categoryCount)}
					</span>
				</li>
				<li className='flex items-center justify-between'>
					<span>Unidades en stock</span>
					<span className='font-semibold text-gray-900'>
						{numberFormatter.format(Math.round(inventoryUnits))}
					</span>
				</li>
			</ul>
			<div className='mt-6 rounded-lg border border-dashed border-blush-200 bg-blush-50 px-4 py-3 text-xs text-gray-600'>
				{lowStockCount > 0 ? (
					<p>
						{numberFormatter.format(lowStockCount)} producto(s) con stock bajo
						necesitan acción.
					</p>
				) : (
					<p>Todos los productos activos tienen existencias saludables.</p>
				)}
			</div>
		</div>
	);
}

function LowStockList({ items }: { items: LowStockRow[] }) {
	return (
		<div className='rounded-xl border border-amber-200 bg-white shadow-sm'>
			<div className='border-b border-amber-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Stock por agotarse
				</h2>
				<p className='text-sm text-gray-500'>Prioriza reposiciones críticas.</p>
			</div>
			{items.length ? (
				<ul className='divide-y divide-gray-200'>
					{items.map((item) => (
						<li key={item.id} className='px-6 py-4'>
							<div className='flex items-center justify-between text-sm'>
								<Link
									href={`/inventory/${item.id}`}
									className='font-medium text-gray-900 transition hover:text-amber-600'>
									{item.name}
								</Link>
								<span className='inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700'>
									{numberFormatter.format(
										Math.max(0, Math.round(item.quantity)),
									)}{" "}
									en stock
								</span>
							</div>
						</li>
					))}
				</ul>
			) : (
				<p className='px-6 py-8 text-sm text-gray-500'>
					Tu inventario activo no tiene alertas de stock.
				</p>
			)}
		</div>
	);
}

function ensureArray<T = unknown>(value: unknown): T[] {
	if (Array.isArray(value)) {
		return value as T[];
	}
	return [];
}

function safeNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function buildWeeklyTrendFromOrders(
	orders: OrderSnapshotRow[],
): SalesTrendPoint[] {
	const windowStart = new Date();
	windowStart.setDate(windowStart.getDate() - 6);
	windowStart.setHours(0, 0, 0, 0);

	const buckets = new Map<
		string,
		{ total: number; profit: number; count: number }
	>();

	for (const order of orders) {
		if (!order.created_at) {
			continue;
		}
		const createdAt = new Date(order.created_at);
		if (Number.isNaN(createdAt.getTime())) {
			continue;
		}
		if (createdAt < windowStart) {
			continue;
		}
		const key = createdAt.toISOString().slice(0, 10);
		const entry = buckets.get(key) ?? { total: 0, profit: 0, count: 0 };
		entry.total += safeNumber(order.total_amount);
		entry.profit += safeNumber(order.profit_amount);
		entry.count += 1;
		buckets.set(key, entry);
	}

	const trend: SalesTrendPoint[] = [];
	for (let offset = 6; offset >= 0; offset -= 1) {
		const date = new Date();
		date.setDate(date.getDate() - offset);
		date.setHours(0, 0, 0, 0);
		const key = date.toISOString().slice(0, 10);
		const entry = buckets.get(key) ?? { total: 0, profit: 0, count: 0 };
		trend.push({
			saleDate: key,
			totalAmount: entry.total,
			profitAmount: entry.profit,
			orderCount: entry.count,
		});
	}

	return trend;
}

function buildEmptyWeeklyTrend(): SalesTrendPoint[] {
	const trend: SalesTrendPoint[] = [];
	for (let offset = 6; offset >= 0; offset -= 1) {
		const date = new Date();
		date.setDate(date.getDate() - offset);
		trend.push({
			saleDate: date.toISOString().slice(0, 10),
			totalAmount: 0,
			profitAmount: 0,
			orderCount: 0,
		});
	}
	return trend;
}
