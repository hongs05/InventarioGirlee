import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { ExpenseForm } from "./_components/expense-form";
import { InventoryIntakeForm } from "./_components/inventory-intake-form";

const DEFAULT_CURRENCIES = ["NIO", "USD"] as const;

const dateTimeFormatter = new Intl.DateTimeFormat("es-NI", {
	dateStyle: "medium",
	timeStyle: "short",
});

const monthFormatter = new Intl.DateTimeFormat("es-NI", { month: "long" });
const numberFormatter = new Intl.NumberFormat("es-NI");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
	expense: "Operativo",
	inventory: "Inventario",
};

const TRANSACTION_TYPE_STYLES: Record<string, string> = {
	expense: "bg-amber-100 text-amber-700",
	inventory: "bg-emerald-100 text-emerald-700",
};

type ProductQueryRow = {
	id: string;
	name: string;
	quantity: number | string | null;
	currency: string | null;
	cost_price: number | string | null;
};

type ExpenseRow = {
	id: string;
	description: string;
	amount: number | string | null;
	currency: string | null;
	type: string | null;
	category: string | null;
	occurred_at: string;
	provider_name: string | null;
};

type MonthlyExpenseRow = {
	amount: number | string | null;
	currency: string | null;
	type: string | null;
};

type InventoryIntakeRow = {
	id: string;
	product_id: string;
	quantity: number | string | null;
	total_cost: number | string | null;
	currency: string | null;
	occurred_at: string;
	provider_name: string | null;
	products: { name: string | null } | null;
};

type MonthlyInventoryIntakeRow = {
	quantity: number | string | null;
	total_cost: number | string | null;
	currency: string | null;
};

type ProductOption = {
	id: string;
	name: string;
	quantity: number | null;
	currency: string | null;
	cost_price: number | null;
};

type CurrencyTotals = Map<string, number>;

export default async function FinancePage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const now = new Date();
	const startOfMonth = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
	);
	const startOfMonthIso = startOfMonth.toISOString();
	const monthLabel = monthFormatter.format(now);

	const [
		productsResponse,
		recentExpensesResponse,
		monthlyExpensesResponse,
		recentIntakeResponse,
		monthlyIntakeResponse,
	] = await Promise.all([
		supabase
			.from("products")
			.select("id, name, quantity, currency, cost_price")
			.order("name", { ascending: true }),
		supabase
			.from("expense_transactions")
			.select(
				"id, description, amount, currency, type, category, occurred_at, provider_name",
			)
			.order("occurred_at", { ascending: false })
			.limit(10),
		supabase
			.from("expense_transactions")
			.select("amount, currency, type")
			.gte("occurred_at", startOfMonthIso),
		supabase
			.from("inventory_intake")
			.select(
				"id, product_id, quantity, total_cost, currency, occurred_at, provider_name, products(name)",
			)
			.order("occurred_at", { ascending: false })
			.limit(10),
		supabase
			.from("inventory_intake")
			.select("quantity, total_cost, currency")
			.gte("occurred_at", startOfMonthIso),
	]);

	if (productsResponse.error) {
		console.error("[finance] Failed to load products", productsResponse.error);
	}
	if (recentExpensesResponse.error) {
		console.error(
			"[finance] Failed to load recent expenses",
			recentExpensesResponse.error,
		);
	}
	if (monthlyExpensesResponse.error) {
		console.error(
			"[finance] Failed to load monthly expenses",
			monthlyExpensesResponse.error,
		);
	}
	if (recentIntakeResponse.error) {
		console.error(
			"[finance] Failed to load recent inventory intake",
			recentIntakeResponse.error,
		);
	}
	if (monthlyIntakeResponse.error) {
		console.error(
			"[finance] Failed to load monthly inventory intake",
			monthlyIntakeResponse.error,
		);
	}

	const productRows = (productsResponse.data ?? []) as ProductQueryRow[];
	const recentExpenses = (recentExpensesResponse.data ?? []) as ExpenseRow[];
	const monthlyExpenses = (monthlyExpensesResponse.data ??
		[]) as MonthlyExpenseRow[];
	const recentInventoryIntake = (recentIntakeResponse.data ??
		[]) as InventoryIntakeRow[];
	const monthlyInventoryIntake = (monthlyIntakeResponse.data ??
		[]) as MonthlyInventoryIntakeRow[];

	const productOptions: ProductOption[] = productRows.map((product) => ({
		id: product.id,
		name: product.name,
		quantity: numericOrNull(product.quantity),
		currency: product.currency,
		cost_price: numericOrNull(product.cost_price),
	}));

	const currencySet = new Set<string>(DEFAULT_CURRENCIES);
	for (const product of productOptions) {
		if (product.currency) {
			currencySet.add(product.currency);
		}
	}
	for (const expense of recentExpenses) {
		if (expense.currency) {
			currencySet.add(expense.currency);
		}
	}
	for (const intake of recentInventoryIntake) {
		if (intake.currency) {
			currencySet.add(intake.currency);
		}
	}

	const currencies = Array.from(currencySet);
	const primaryCurrency = currencies[0] ?? "NIO";

	const totalExpenseTotals: CurrencyTotals = new Map();
	const operationalExpenseTotals: CurrencyTotals = new Map();
	const inventoryExpenseTotals: CurrencyTotals = new Map();

	for (const row of monthlyExpenses) {
		addCurrencyAmount(totalExpenseTotals, row.currency, row.amount);

		if (row.type === "expense") {
			addCurrencyAmount(operationalExpenseTotals, row.currency, row.amount);
		}

		if (row.type === "inventory") {
			addCurrencyAmount(inventoryExpenseTotals, row.currency, row.amount);
		}
	}

	const inventoryCostTotals: CurrencyTotals = new Map();
	let inventoryUnitsThisMonth = 0;

	for (const intake of monthlyInventoryIntake) {
		addCurrencyAmount(inventoryCostTotals, intake.currency, intake.total_cost);
		inventoryUnitsThisMonth += numericOrZero(intake.quantity);
	}

	const daysElapsed = Math.max(
		1,
		Math.floor((now.getTime() - startOfMonth.getTime()) / MS_PER_DAY) + 1,
	);
	const averageDailyTotals: CurrencyTotals = new Map();

	for (const [currency, total] of totalExpenseTotals.entries()) {
		averageDailyTotals.set(currency, total / daysElapsed);
	}

	const averageDailyLabel = formatCurrencyTotals(
		averageDailyTotals,
		primaryCurrency,
	);

	const summaryCards: Array<{
		title: string;
		value: string;
		helper: string;
	}> = [
		{
			title: "Gasto mensual",
			value: formatCurrencyTotals(totalExpenseTotals, primaryCurrency),
			helper: `Incluye gastos operativos e inventario · Promedio diario: ${averageDailyLabel}`,
		},
		{
			title: "Gasto operativo",
			value: formatCurrencyTotals(operationalExpenseTotals, primaryCurrency),
			helper: `Gastos operativos en ${monthLabel}`,
		},
		{
			title: "Gasto en inventario",
			value: formatCurrencyTotals(inventoryCostTotals, primaryCurrency),
			helper: "Costo de ingresos de inventario durante el mes",
		},
		{
			title: "Unidades ingresadas",
			value: `${numberFormatter.format(inventoryUnitsThisMonth)} uds`,
			helper: `Unidades agregadas al inventario en ${monthLabel}`,
		},
	];

	const hasProducts = productOptions.length > 0;

	return (
		<DashboardShell
			user={user}
			currentPath='/finance'
			title='Finanzas'
			description='Controla tus gastos, ingresos de inventario y métricas financieras en un solo lugar.'>
			<section className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
				{summaryCards.map((card) => (
					<SummaryCard key={card.title} {...card} />
				))}
			</section>

			<section className='grid gap-6 lg:grid-cols-2'>
				<ExpenseForm currencies={currencies} />
				{hasProducts ? (
					<InventoryIntakeForm
						products={productOptions}
						currencies={currencies}
					/>
				) : (
					<InventoryIntakeUnavailableCard />
				)}
			</section>

			<section className='grid gap-6 lg:grid-cols-2'>
				<RecentExpenses expenses={recentExpenses} />
				<RecentInventoryIntake entries={recentInventoryIntake} />
			</section>
		</DashboardShell>
	);
}

type SummaryCardProps = {
	title: string;
	value: string;
	helper: string;
};

function SummaryCard({ title, value, helper }: SummaryCardProps) {
	return (
		<div className='rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
			<p className='text-xs font-medium uppercase tracking-wide text-blush-500'>
				{title}
			</p>
			<p className='mt-2 text-3xl font-semibold text-gray-900'>{value}</p>
			<p className='mt-2 text-xs text-gray-500'>{helper}</p>
		</div>
	);
}

type RecentExpensesProps = {
	expenses: ExpenseRow[];
};

function RecentExpenses({ expenses }: RecentExpensesProps) {
	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>Últimos gastos</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Registros recientes de gastos operativos e inventario.
				</p>
			</div>
			{expenses.length ? (
				<ul className='divide-y divide-gray-200'>
					{expenses.map((expense) => {
						const amount = formatCurrency(
							numericOrZero(expense.amount),
							expense.currency ?? "NIO",
						);
						const occurredAt = dateTimeFormatter.format(
							new Date(expense.occurred_at),
						);

						return (
							<li key={expense.id} className='px-6 py-4'>
								<div className='flex flex-wrap items-start justify-between gap-4'>
									<div>
										<div className='flex items-center gap-2'>
											<p className='text-sm font-medium text-gray-900'>
												{expense.description}
											</p>
											<TypeBadge type={expense.type} />
										</div>
										<p className='mt-1 text-xs text-gray-500'>
											{formatExpenseMeta(expense)}
										</p>
									</div>
									<div className='text-right'>
										<p className='text-sm font-semibold text-gray-900'>
											{amount}
										</p>
										<p className='mt-1 text-xs text-gray-500'>{occurredAt}</p>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className='px-6 py-8 text-sm text-gray-500'>
					Aún no registras gastos. Usa el formulario para comenzar.
				</p>
			)}
		</div>
	);
}

type RecentInventoryIntakeProps = {
	entries: InventoryIntakeRow[];
};

function RecentInventoryIntake({ entries }: RecentInventoryIntakeProps) {
	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Ingresos de inventario
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Últimas reposiciones con impacto en el stock y costo.
				</p>
			</div>
			{entries.length ? (
				<ul className='divide-y divide-gray-200'>
					{entries.map((entry) => {
						const quantity = numberFormatter.format(
							numericOrZero(entry.quantity),
						);
						const totalCost = formatCurrency(
							numericOrZero(entry.total_cost),
							entry.currency ?? "NIO",
						);
						const occurredAt = dateTimeFormatter.format(
							new Date(entry.occurred_at),
						);
						const productName = entry.products?.name ?? "Producto eliminado";

						return (
							<li key={entry.id} className='px-6 py-4'>
								<div className='flex flex-wrap items-start justify-between gap-4'>
									<div>
										<p className='text-sm font-medium text-gray-900'>
											{productName}
										</p>
										<p className='mt-1 text-xs text-gray-500'>
											{formatInventoryMeta(entry, quantity)}
										</p>
									</div>
									<div className='text-right'>
										<p className='text-sm font-semibold text-gray-900'>
											{totalCost}
										</p>
										<p className='mt-1 text-xs text-gray-500'>{occurredAt}</p>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className='px-6 py-8 text-sm text-gray-500'>
					Aún no registras ingresos de inventario.
				</p>
			)}
		</div>
	);
}

function InventoryIntakeUnavailableCard() {
	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Ingreso de inventario
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Crea al menos un producto para habilitar el registro de inventario.
				</p>
			</div>
			<div className='space-y-4 px-6 py-6 text-sm text-gray-600'>
				<p>
					Aún no tienes productos en tu catálogo. Agrega un producto para poder
					ingresar nuevas unidades al inventario.
				</p>
				<Link
					href='/inventory/new'
					className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
					Crear producto
				</Link>
			</div>
		</div>
	);
}

type TypeBadgeProps = {
	type: string | null;
};

function TypeBadge({ type }: TypeBadgeProps) {
	if (!type) {
		return null;
	}

	const label = TRANSACTION_TYPE_LABELS[type] ?? type;
	const style = TRANSACTION_TYPE_STYLES[type] ?? "bg-gray-100 text-gray-600";

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style}`}>
			{label}
		</span>
	);
}

function formatExpenseMeta(expense: ExpenseRow): string {
	const parts: string[] = [];

	if (expense.category) {
		parts.push(expense.category);
	}
	if (expense.provider_name) {
		parts.push(`Proveedor: ${expense.provider_name}`);
	}

	return parts.length ? parts.join(" · ") : "Sin detalles adicionales";
}

function formatInventoryMeta(
	entry: InventoryIntakeRow,
	quantityLabel: string,
): string {
	const parts: string[] = [`Cantidad: ${quantityLabel}`];

	if (entry.provider_name) {
		parts.push(`Proveedor: ${entry.provider_name}`);
	}

	return parts.join(" · ");
}

function addCurrencyAmount(
	totals: CurrencyTotals,
	currency: string | null | undefined,
	amount: number | string | null | undefined,
) {
	if (!currency) {
		return;
	}

	const parsed = numericOrZero(amount);

	if (!Number.isFinite(parsed)) {
		return;
	}

	totals.set(currency, (totals.get(currency) ?? 0) + parsed);
}

function formatCurrencyTotals(
	totals: CurrencyTotals,
	fallbackCurrency: string,
): string {
	if (totals.size === 0) {
		return formatCurrency(0, fallbackCurrency);
	}

	return Array.from(totals.entries())
		.sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
		.map(([currency, amount]) => formatCurrency(amount, currency))
		.join(" · ");
}

function formatCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function numericOrNull(
	value: number | string | null | undefined,
): number | null {
	if (value === null || value === undefined) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function numericOrZero(value: number | string | null | undefined): number {
	if (value === null || value === undefined) {
		return 0;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}
