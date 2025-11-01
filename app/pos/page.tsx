import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PosTerminal } from "./_components/pos-terminal";

const DEFAULT_CURRENCY = "NIO";

type ProductRow = {
	id: string;
	name: string;
	sell_price: number | null;
	cost_price: number | null;
	quantity: number | null;
	currency: string | null;
	status: string | null;
	image_path: string | null;
};

type ComboItemRow = {
	product_id: string | null;
	qty: number | null;
	products: { id: string; name: string } | null;
};

type ComboRow = {
	id: string;
	name: string;
	suggested_price: number | null;
	packaging_cost: number | null;
	status: string | null;
	image_path: string | null;
	combo_items: ComboItemRow[] | null;
};

type OrderRow = {
	id: string;
	total_amount: number | null;
	profit_amount: number | null;
	total_cost: number | null;
	created_at: string;
	payment_method: string | null;
};

function parseNumber(value: number | string | null | undefined) {
	if (value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export default async function PosPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const [productsResponse, combosResponse, ordersResponse] = await Promise.all([
		supabase
			.from("products")
			.select(
				"id, name, sell_price, cost_price, quantity, currency, status, image_path",
			)
			.order("name", { ascending: true }),
		supabase
			.from("combos")
			.select(
				"id, name, suggested_price, packaging_cost, status, image_path, combo_items(product_id, qty, products(id, name))",
			)
			.order("name", { ascending: true }),
		supabase
			.from("orders")
			.select(
				"id, total_amount, total_cost, profit_amount, created_at, payment_method",
			)
			.order("created_at", { ascending: false })
			.limit(30),
	]);

	const rawProducts = (productsResponse?.data ?? []) as ProductRow[];
	const rawCombos = (combosResponse?.data ?? []) as ComboRow[];
	const rawOrders = (ordersResponse?.data ?? []) as OrderRow[];

	const activeProducts = rawProducts
		.filter((product) => (product.status ?? "active") === "active")
		.map((product) => {
			const cost = Math.max(parseNumber(product.cost_price), 0);
			const priceCandidate = parseNumber(product.sell_price);
			const price = priceCandidate > 0 ? priceCandidate : Math.max(cost, 0);
			return {
				id: product.id,
				name: product.name,
				price,
				cost,
				quantity: product.quantity,
				currency: product.currency ?? DEFAULT_CURRENCY,
				imageUrl: product.image_path ?? null,
			};
		});

	const activeCombos = rawCombos
		.filter((combo) => (combo.status ?? "active") === "active")
		.map((combo) => ({
			id: combo.id,
			name: combo.name,
			price: Math.max(parseNumber(combo.suggested_price), 0),
			currency: DEFAULT_CURRENCY,
			packagingCost: parseNumber(combo.packaging_cost),
			imageUrl: combo.image_path ?? null,
			items: (combo.combo_items ?? [])
				.filter(
					(item): item is ComboItemRow & { product_id: string; qty: number } =>
						Boolean(item?.product_id) && Number.isFinite(item?.qty ?? NaN),
				)
				.map((item) => ({
					productId: item.product_id as string,
					productName: item.products?.name ?? "Producto",
					qty: Math.max(1, parseNumber(item.qty)),
				})),
		}));

	const currency =
		activeProducts[0]?.currency ??
		activeCombos[0]?.currency ??
		DEFAULT_CURRENCY;

	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const earningsSnapshot = rawOrders.reduce(
		(acc, order) => {
			const total = parseNumber(order.total_amount);
			const profit =
				order.profit_amount !== null
					? parseNumber(order.profit_amount)
					: total - parseNumber(order.total_cost);
			const createdAt = new Date(order.created_at);

			if (createdAt >= startOfDay) {
				acc.todayRevenue += total;
				acc.todayProfit += profit;
			}

			acc.totalRevenue += total;
			acc.totalProfit += profit;
			acc.recent.push({
				id: order.id,
				totalAmount: total,
				profitAmount: profit,
				paymentMethod: order.payment_method ?? "cash",
				createdAt: order.created_at,
			});

			return acc;
		},
		{
			totalRevenue: 0,
			totalProfit: 0,
			todayRevenue: 0,
			todayProfit: 0,
			recent: [] as Array<{
				id: string;
				totalAmount: number;
				profitAmount: number;
				paymentMethod: string;
				createdAt: string;
			}>,
		},
	);

	const { totalRevenue, totalProfit, todayRevenue, todayProfit, recent } =
		earningsSnapshot;

	return (
		<DashboardShell
			user={user}
			currentPath='/pos'
			title='Punto de venta'
			description='Registra ventas, controla comprobantes y visualiza tus márgenes en tiempo real.'>
			<PosTerminal
				products={activeProducts}
				combos={activeCombos}
				currency={currency}
				earnings={{
					totalRevenue,
					totalProfit,
					todayRevenue,
					todayProfit,
					recent,
				}}
			/>
		</DashboardShell>
	);
}
