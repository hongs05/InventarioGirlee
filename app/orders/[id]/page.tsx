import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import OrderReceiptCard, {
	type OrderReceiptData,
	type OrderReceiptItem,
} from "@/app/orders/_components/order-receipt";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const STATUS_LABELS: Record<string, string> = {
	pending: "Pendiente",
	processing: "En proceso",
	completed: "Completada",
	cancelled: "Cancelada",
};

const PAYMENT_LABELS: Record<string, string> = {
	cash: "Efectivo",
	card: "Tarjeta",
	transfer: "Transferencia",
};

type OrderDetailRow = {
	id: string;
	receipt_number: string | number | null;
	customer_name: string | null;
	customer_phone: string | number | null;
	customer_email: string | null;
	notes: string | null;
	status: string | null;
	payment_method: string | null;
	payment_reference: string | number | null;
	subtotal_amount: number | string | null;
	discount_amount: number | string | null;
	tax_amount: number | string | null;
	total_amount: number | string | null;
	total_cost: number | string | null;
	profit_amount: number | string | null;
	currency: string | null;
	created_at: string;
	updated_at: string;
	order_product_items: Array<{
		id: number;
		qty: number | string | null;
		unit_price: number | string | null;
		unit_cost: number | string | null;
		line_total: number | string | null;
		line_cost_total: number | string | null;
		products: {
			id: string;
			name: string | null;
			sku: string | null;
		} | null;
	}>;
	order_combo_items: Array<{
		id: number;
		qty: number | string | null;
		unit_price: number | string | null;
		unit_cost: number | string | null;
		line_total: number | string | null;
		line_cost_total: number | string | null;
		combos: {
			id: string;
			name: string | null;
		} | null;
	}>;
};

type OrderDetailProps = {
	params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailProps) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data, error } = await supabase
		.from("orders")
		.select(
			"id, receipt_number, customer_name, customer_phone, customer_email, notes, status, payment_method, payment_reference, subtotal_amount, discount_amount, tax_amount, total_amount, total_cost, profit_amount, currency, created_at, updated_at, order_product_items(id, qty, unit_price, unit_cost, line_total, line_cost_total, products(id, name, sku)), order_combo_items(id, qty, unit_price, unit_cost, line_total, line_cost_total, combos(id, name)))",
		)
		.eq("id", id)
		.maybeSingle();

	if (error) {
		console.error(error);
		throw new Error("No pudimos cargar la orden seleccionada.");
	}

	if (!data) {
		notFound();
	}

	const order = data as OrderDetailRow;
	const currency = order.currency ?? "NIO";
	const productItems = order.order_product_items ?? [];
	const comboItems = order.order_combo_items ?? [];
	const normalizedNotes = normalizeText(order.notes);

	const receiptItems: OrderReceiptItem[] = [
		...productItems.map((item) => ({
			name: normalizeText(item.products?.name) ?? "Producto",
			qty: Math.max(0, parseNumber(item.qty)),
			unitPrice: parseNumber(item.unit_price),
		})),
		...comboItems.map((item) => ({
			name: `${normalizeText(item.combos?.name) ?? "Combo"} (Combo)`,
			qty: Math.max(0, parseNumber(item.qty)),
			unitPrice: parseNumber(item.unit_price),
		})),
	].filter((item) => Number.isFinite(item.unitPrice) && item.qty > 0);

	const subtotal = parseNumber(order.subtotal_amount);
	const discount = parseNumber(order.discount_amount);
	const tax = parseNumber(order.tax_amount);
	const total = parseNumber(order.total_amount);
	const totalCost = parseNumber(order.total_cost);
	const profit =
		order.profit_amount !== null
			? parseNumber(order.profit_amount)
			: total - totalCost;

	const paymentMethod =
		normalizeText(order.payment_method)?.toLowerCase() ?? "cash";

	const receiptData: OrderReceiptData = {
		receiptNumber: normalizeText(order.receipt_number) ?? undefined,
		createdAt: order.created_at,
		paymentMethod,
		customerName: normalizeText(order.customer_name) ?? undefined,
		customerPhone: normalizeText(order.customer_phone) ?? undefined,
		notes: normalizedNotes ?? undefined,
		subtotal,
		discount,
		tax,
		total,
		profit,
		currency,
		items: receiptItems,
	};

	return (
		<DashboardShell
			user={user}
			currentPath='/orders'
			title='Detalle de orden'
			description='Revisa los detalles de la venta, artículos vendidos y márgenes obtenidos.'
			action={
				<Link
					href='/orders'
					className='inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100'>
					Volver a órdenes
				</Link>
			}>
			<div className='grid gap-6'>
				<OrderReceiptCard receipt={receiptData} />
				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<h2 className='text-lg font-semibold text-gray-900'>
						Resumen financiero
					</h2>
					<div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						<SummaryCard
							label='Subtotal'
							value={formatCurrency(subtotal, currency)}
						/>
						<SummaryCard
							label='Descuento'
							value={formatCurrency(discount, currency)}
						/>
						<SummaryCard
							label='Impuesto'
							value={formatCurrency(tax, currency)}
						/>
						<SummaryCard
							label='Total'
							value={formatCurrency(total, currency)}
							emphasis
						/>
						<SummaryCard
							label='Costo total'
							value={formatCurrency(totalCost, currency)}
						/>
						<SummaryCard
							label='Ganancia'
							value={formatCurrency(profit, currency)}
							emphasis
						/>
					</div>
				</section>

				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<h2 className='text-lg font-semibold text-gray-900'>
						Información de la orden
					</h2>
					<div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						<InfoBlock label='Estado'>
							<OrderStatusBadge status={order.status} />
						</InfoBlock>
						<InfoBlock label='Método de pago'>
							{formatPayment(order.payment_method)}
						</InfoBlock>
						<InfoBlock label='Referencia de pago'>
							{displayText(order.payment_reference, "Sin referencia")}
						</InfoBlock>
						<InfoBlock label='Comprobante'>
							{displayText(order.receipt_number, "Sin número")}
						</InfoBlock>
						<InfoBlock label='Cliente'>
							{displayText(order.customer_name, "Cliente sin nombre")}
						</InfoBlock>
						<InfoBlock label='Teléfono'>
							{displayText(order.customer_phone, "Sin teléfono")}
						</InfoBlock>
						<InfoBlock label='Correo electrónico'>
							{displayText(order.customer_email, "Sin correo")}
						</InfoBlock>
						<InfoBlock label='Creada el'>
							{formatDate(order.created_at)}
						</InfoBlock>
						<InfoBlock label='Actualizada el'>
							{formatDate(order.updated_at)}
						</InfoBlock>
					</div>
					{normalizedNotes ? (
						<div className='mt-6 rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600'>
							<strong className='font-semibold text-gray-900'>Notas:</strong>{" "}
							{normalizedNotes}
						</div>
					) : null}
				</section>

				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
						<h2 className='text-lg font-semibold text-gray-900'>
							Productos vendidos
						</h2>
						<span className='text-xs text-gray-500'>
							{productItems.length} línea{productItems.length === 1 ? "" : "s"}
						</span>
					</div>
					{productItems.length ? (
						<div className='mt-4 overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200 text-sm'>
								<thead className='bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500'>
									<tr>
										<th className='px-4 py-3 text-left'>Producto</th>
										<th className='px-4 py-3 text-left'>SKU</th>
										<th className='px-4 py-3 text-left'>Cantidad</th>
										<th className='px-4 py-3 text-left'>Precio unitario</th>
										<th className='px-4 py-3 text-left'>Costo unitario</th>
										<th className='px-4 py-3 text-left'>Importe</th>
										<th className='px-4 py-3 text-left'>Costo</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200'>
									{productItems.map((item) => {
										const qty = parseNumber(item.qty);
										return (
											<tr
												key={`product-${item.id}`}
												className='hover:bg-blush-50'>
												<td className='px-4 py-3 text-gray-900'>
													{item.products?.name ?? "Producto"}
												</td>
												<td className='px-4 py-3 text-gray-500'>
													{item.products?.sku ?? "—"}
												</td>
												<td className='px-4 py-3 text-gray-700'>{qty}</td>
												<td className='px-4 py-3 text-gray-700'>
													{formatCurrency(
														parseNumber(item.unit_price),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-700'>
													{formatCurrency(
														parseNumber(item.unit_cost),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-900'>
													{formatCurrency(
														parseNumber(item.line_total),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-900'>
													{formatCurrency(
														parseNumber(item.line_cost_total),
														currency,
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<p className='mt-4 text-sm text-gray-500'>
							No se registraron productos individuales en esta orden.
						</p>
					)}
				</section>

				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
						<h2 className='text-lg font-semibold text-gray-900'>
							Combos vendidos
						</h2>
						<span className='text-xs text-gray-500'>
							{comboItems.length} línea{comboItems.length === 1 ? "" : "s"}
						</span>
					</div>
					{comboItems.length ? (
						<div className='mt-4 overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200 text-sm'>
								<thead className='bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500'>
									<tr>
										<th className='px-4 py-3 text-left'>Combo</th>
										<th className='px-4 py-3 text-left'>Cantidad</th>
										<th className='px-4 py-3 text-left'>Precio unitario</th>
										<th className='px-4 py-3 text-left'>Costo unitario</th>
										<th className='px-4 py-3 text-left'>Importe</th>
										<th className='px-4 py-3 text-left'>Costo</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200'>
									{comboItems.map((item) => {
										const qty = parseNumber(item.qty);
										return (
											<tr
												key={`combo-${item.id}`}
												className='hover:bg-blush-50'>
												<td className='px-4 py-3 text-gray-900'>
													{item.combos?.name ?? "Combo"}
												</td>
												<td className='px-4 py-3 text-gray-700'>{qty}</td>
												<td className='px-4 py-3 text-gray-700'>
													{formatCurrency(
														parseNumber(item.unit_price),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-700'>
													{formatCurrency(
														parseNumber(item.unit_cost),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-900'>
													{formatCurrency(
														parseNumber(item.line_total),
														currency,
													)}
												</td>
												<td className='px-4 py-3 text-gray-900'>
													{formatCurrency(
														parseNumber(item.line_cost_total),
														currency,
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<p className='mt-4 text-sm text-gray-500'>
							No se registraron combos en esta orden.
						</p>
					)}
				</section>
			</div>
		</DashboardShell>
	);
}

function parseNumber(value: string | number | null | undefined) {
	if (value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown) {
	if (value === null || value === undefined) {
		return null;
	}

	const stringValue = typeof value === "string" ? value : String(value);
	const trimmed = stringValue.trim();
	return trimmed.length ? trimmed : null;
}

function displayText(value: unknown, fallback: string) {
	return normalizeText(value) ?? fallback;
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function formatPayment(method: string | null | undefined) {
	const normalized = (method ?? "cash").toLowerCase();
	return PAYMENT_LABELS[normalized] ?? normalized;
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

function SummaryCard({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div
			className={`rounded-lg border border-gray-200 p-4 ${
				emphasis ? "bg-blush-50" : "bg-white"
			}`}>
			<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
				{label}
			</p>
			<p className='mt-2 text-xl font-semibold text-gray-900'>{value}</p>
		</div>
	);
}

function InfoBlock({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className='rounded-lg border border-gray-100 bg-gray-50/80 p-4'>
			<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
				{label}
			</p>
			<p className='mt-2 text-sm text-gray-900'>{children}</p>
		</div>
	);
}
