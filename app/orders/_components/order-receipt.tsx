"use client";

import { useCallback, useMemo, useRef } from "react";

export type OrderReceiptItem = {
	name: string;
	qty: number;
	unitPrice: number;
};

export type OrderReceiptData = {
	receiptNumber?: string;
	createdAt: string;
	paymentMethod: string;
	customerName?: string;
	customerPhone?: string;
	notes?: string;
	subtotal: number;
	discount: number;
	tax: number;
	total: number;
	profit: number;
	currency: string;
	items: OrderReceiptItem[];
};

type OrderReceiptProps = {
	receipt: OrderReceiptData;
};

const PAYMENT_LABELS: Record<string, string> = {
	cash: "Efectivo",
	card: "Tarjeta",
	transfer: "Transferencia",
};

const PRINT_STYLES = `
	* { box-sizing: border-box; }
	@page { margin: 6mm; }
	body {
		margin: 0;
		padding: 24px;
		background: #f3f4f6;
		display: flex;
		justify-content: center;
		font-family: "Courier New", Courier, monospace;
		color: #111827;
	}
	.thermal-receipt {
		width: 70mm;
		background: #fff;
		padding: 18px 18px 24px;
		border: 1px solid #e5e7eb;
		position: relative;
		overflow: hidden;
	}
	.thermal-receipt::before,
	.thermal-receipt::after {
		content: '';
		position: absolute;
		left: 0;
		width: 100%;
		height: 10px;
		background: repeating-linear-gradient(90deg, #fff, #fff 7px, transparent 7px, transparent 14px);
		opacity: 0.45;
	}
	.thermal-receipt::before { top: -5px; }
	.thermal-receipt::after { bottom: -5px; transform: rotate(180deg); }
	.thermal-receipt__header {
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}
	.thermal-receipt__subtitle {
		font-size: 11px;
		letter-spacing: 0.12em;
		margin-top: 4px;
		text-transform: uppercase;
		color: #6b7280;
	}
	.thermal-meta {
		margin-top: 12px;
		font-size: 12px;
		color: #374151;
	}
	.thermal-meta__line {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.thermal-meta__line + .thermal-meta__line { margin-top: 4px; }
	.thermal-receipt__divider {
		margin: 14px 0;
		border-top: 1px dashed #d1d5db;
	}
	.thermal-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}
	.thermal-table th {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #6b7280;
		padding-bottom: 6px;
		border-bottom: 1px dashed #d1d5db;
	}
	.thermal-table td {
		padding: 6px 0;
		border-bottom: 1px dashed #f3f4f6;
	}
	.thermal-table td:nth-child(2) { text-align: center; }
	.thermal-table td:last-child { text-align: right; }
	.thermal-summary {
		margin-top: 12px;
		font-size: 12px;
		color: #374151;
	}
	.thermal-summary-row {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
	}
	.thermal-summary-row.is-total {
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
		margin-top: 6px;
	}
	.thermal-summary-row.is-accent {
		font-size: 11px;
		text-transform: uppercase;
		color: #6b7280;
		padding-top: 8px;
	}
	.thermal-notes {
		margin-top: 12px;
		font-size: 11px;
		color: #4b5563;
	}
	.thermal-footer {
		margin-top: 16px;
		text-align: center;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #6b7280;
	}
	.thermal-footer p + p { margin-top: 4px; }
	@media print {
		body { background: #fff; padding: 0; }
		.thermal-receipt { border: none; }
	}
`;

export default function OrderReceiptCard({ receipt }: OrderReceiptProps) {
	const receiptRef = useRef<HTMLDivElement>(null);

	const noteText = useMemo(() => {
		if (!receipt.notes) return "";
		return receipt.notes.trim();
	}, [receipt.notes]);

	const handlePrint = useCallback(() => {
		if (!receiptRef.current) return;

		const printWindow = window.open(
			"",
			"order-receipt",
			"width=720,height=900",
		);
		if (!printWindow) return;

		const receiptMarkup = receiptRef.current.innerHTML;

		printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${sanitizeHtmlAttribute(receipt.receiptNumber ?? "")}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${receiptMarkup}
</body>
</html>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
		printWindow.close();
	}, [receipt]);

	const discountDisplay =
		receipt.discount > 0 ? -Math.abs(receipt.discount) : 0;
	const receiptNumber = receipt.receiptNumber ?? "S/N";
	const customerName = receipt.customerName ?? "Cliente sin nombre";
	const customerPhone = receipt.customerPhone ?? undefined;

	return (
		<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h2 className='text-lg font-semibold text-gray-900'>
						Recibo de la venta
					</h2>
					<p className='text-sm text-gray-500'>
						Imprime un comprobante con formato térmico.
					</p>
				</div>
				<button
					type='button'
					onClick={handlePrint}
					className='inline-flex items-center justify-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
					Imprimir recibo
				</button>
			</div>
			<div className='mt-4 flex justify-center'>
				<div ref={receiptRef} className='thermal-receipt'>
					<div className='thermal-receipt__header'>
						<p>Inventario Girlee</p>
						<p className='thermal-receipt__subtitle'>
							Beauty &amp; Makeup Supply
						</p>
					</div>
					<div className='thermal-meta'>
						<div className='thermal-meta__line'>
							<span>Recibo</span>
							<span>#{receiptNumber}</span>
						</div>
						<div className='thermal-meta__line'>
							<span>Fecha</span>
							<span>{formatReceiptDate(receipt.createdAt)}</span>
						</div>
						<div className='thermal-meta__line'>
							<span>Pago</span>
							<span>{formatPaymentMethod(receipt.paymentMethod)}</span>
						</div>
						{customerName ? (
							<div className='thermal-meta__line'>
								<span>Cliente</span>
								<span>{customerName}</span>
							</div>
						) : null}
						{customerPhone ? (
							<div className='thermal-meta__line'>
								<span>Teléfono</span>
								<span>{customerPhone}</span>
							</div>
						) : null}
					</div>
					<div className='thermal-receipt__divider' />
					{receipt.items.length ? (
						<table className='thermal-table'>
							<thead>
								<tr>
									<th>Artículo</th>
									<th>Cant.</th>
									<th>Importe</th>
								</tr>
							</thead>
							<tbody>
								{receipt.items.map((item, index) => (
									<tr key={`${item.name}-${index}`}>
										<td>{item.name}</td>
										<td>{item.qty}</td>
										<td>
											{formatCurrency(
												item.unitPrice * item.qty,
												receipt.currency,
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className='thermal-notes'>Sin artículos registrados.</p>
					)}
					<div className='thermal-summary'>
						<div className='thermal-summary-row'>
							<span>Subtotal</span>
							<span>{formatCurrency(receipt.subtotal, receipt.currency)}</span>
						</div>
						<div className='thermal-summary-row'>
							<span>Descuento</span>
							<span>{formatCurrency(discountDisplay, receipt.currency)}</span>
						</div>
						<div className='thermal-summary-row'>
							<span>Impuesto</span>
							<span>{formatCurrency(receipt.tax, receipt.currency)}</span>
						</div>
						<div className='thermal-summary-row is-total'>
							<span>Total</span>
							<span>{formatCurrency(receipt.total, receipt.currency)}</span>
						</div>
						<div className='thermal-summary-row is-accent'>
							<span>Ganancia</span>
							<span>{formatCurrency(receipt.profit, receipt.currency)}</span>
						</div>
					</div>
					{noteText ? (
						<div className='thermal-notes'>
							<strong>Notas:</strong> {noteText}
						</div>
					) : null}
					<div className='thermal-footer'>
						<p>¡Gracias por su compra!</p>
						<p>@InventarioGirlee</p>
					</div>
				</div>
			</div>
		</section>
	);
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(Number.isFinite(value) ? value : 0);
}

function formatReceiptDate(isoDate: string) {
	try {
		return new Intl.DateTimeFormat("es-NI", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(isoDate));
	} catch {
		return isoDate;
	}
}

function formatPaymentMethod(method: string) {
	const normalized = (method ?? "cash").toLowerCase();
	return PAYMENT_LABELS[normalized] ?? method ?? "Efectivo";
}

function sanitizeHtmlAttribute(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
