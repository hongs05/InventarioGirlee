"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import type { ActionErrorRecord } from "@/lib/actions";
import { createSaleAction } from "../actions";

type PaymentMethod = "cash" | "card" | "transfer";

type PosProduct = {
	id: string;
	name: string;
	price: number;
	cost: number;
	quantity: number | null;
	currency: string;
	imageUrl: string | null;
};

type PosCombo = {
	id: string;
	name: string;
	price: number;
	currency: string;
	packagingCost: number;
	imageUrl: string | null;
	items: Array<{ productId: string; productName: string; qty: number }>;
};

type RecentSale = {
	id: string;
	totalAmount: number;
	profitAmount: number;
	paymentMethod: string;
	createdAt: string;
};

type EarningsSnapshot = {
	totalRevenue: number;
	totalProfit: number;
	todayRevenue: number;
	todayProfit: number;
	recent: RecentSale[];
};

type CartLine = {
	key: string;
	type: "product" | "combo";
	entityId: string;
	name: string;
	unitPrice: number;
	qty: number;
	maxQty?: number;
};

type ReceiptLine = {
	name: string;
	qty: number;
	unitPrice: number;
	type: "product" | "combo";
};

type ReceiptData = {
	orderId: string;
	receiptNumber: string;
	createdAt: string;
	paymentMethod: PaymentMethod;
	customerName?: string;
	customerPhone?: string;
	notes?: string;
	subtotal: number;
	discount: number;
	tax: number;
	total: number;
	profit: number;
	currency: string;
	items: ReceiptLine[];
};

type PosTerminalProps = {
	products: PosProduct[];
	combos: PosCombo[];
	currency: string;
	earnings: EarningsSnapshot;
};

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function parseAmount(value: string) {
	const cleaned = value.replace(/[^0-9.,-]/g, "");
	if (!cleaned) return 0;
	const normalized = cleaned.replace(/,/g, ".");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
	return Number(Number(value ?? 0).toFixed(2));
}

function buildCartKey(type: "product" | "combo", id: string) {
	return `${type}-${id}`;
}

export function PosTerminal({
	products,
	combos,
	currency,
	earnings,
}: PosTerminalProps) {
	const [cart, setCart] = useState<CartLine[]>([]);
	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [notes, setNotes] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
	const [receiptNumber, setReceiptNumber] = useState("");
	const [discountInput, setDiscountInput] = useState("0");
	const [taxInput, setTaxInput] = useState("0");
	const [search, setSearch] = useState("");
	const [formErrors, setFormErrors] = useState<ActionErrorRecord | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
	const [snapshot, setSnapshot] = useState<EarningsSnapshot>(earnings);
	const receiptRef = useRef<HTMLDivElement | null>(null);

	const filteredProducts = useMemo(() => {
		if (!search.trim()) return products;
		const term = search.trim().toLowerCase();
		return products.filter((product) =>
			product.name.toLowerCase().includes(term),
		);
	}, [products, search]);

	const subtotal = useMemo(
		() =>
			roundCurrency(
				cart.reduce((acc, line) => acc + line.unitPrice * line.qty, 0),
			),
		[cart],
	);

	const discountAmount = useMemo(
		() => Math.max(0, roundCurrency(parseAmount(discountInput))),
		[discountInput],
	);

	const taxAmount = useMemo(
		() => Math.max(0, roundCurrency(parseAmount(taxInput))),
		[taxInput],
	);

	const total = useMemo(() => {
		const raw = subtotal - discountAmount + taxAmount;
		return raw < 0 ? 0 : roundCurrency(raw);
	}, [discountAmount, subtotal, taxAmount]);

	const canSubmit = cart.length > 0 && !isPending;

	const addProductToCart = useCallback(
		(product: PosProduct) => {
			if (product.quantity !== null && product.quantity <= 0) {
				setFormErrors({
					form: [
						`No quedan existencias de ${product.name}. Actualiza el inventario antes de vender.`,
					],
				});
				return;
			}

			setFormErrors(null);
			setSuccessMessage(null);

			setCart((current) => {
				const key = buildCartKey("product", product.id);
				const existing = current.find((line) => line.key === key);

				if (existing) {
					const maxQty = product.quantity ?? Infinity;
					const nextQty = existing.qty + 1;
					if (nextQty > maxQty) {
						setFormErrors({
							form: [
								`Inventario insuficiente para ${product.name}. Disponible: ${
									product.quantity ?? 0
								}.`,
							],
						});
						return current;
					}

					return current.map((line) =>
						line.key === key ? { ...line, qty: nextQty } : line,
					);
				}

				return [
					...current,
					{
						key,
						type: "product" as const,
						entityId: product.id,
						name: product.name,
						unitPrice: product.price,
						qty: 1,
						maxQty: product.quantity ?? undefined,
					},
				];
			});
		},
		[setCart],
	);

	const addComboToCart = useCallback((combo: PosCombo) => {
		setFormErrors(null);
		setSuccessMessage(null);

		setCart((current) => {
			const key = buildCartKey("combo", combo.id);
			const existing = current.find((line) => line.key === key);
			if (existing) {
				return current.map((line) =>
					line.key === key ? { ...line, qty: line.qty + 1 } : line,
				);
			}

			return [
				...current,
				{
					key,
					type: "combo" as const,
					entityId: combo.id,
					name: combo.name,
					unitPrice: combo.price,
					qty: 1,
				},
			];
		});
	}, []);

	const updateQty = useCallback((key: string, qty: number) => {
		setCart((current) =>
			current
				.map((line) => {
					if (line.key !== key) return line;
					const max = line.maxQty ?? Infinity;
					const nextQty = Math.max(1, Math.min(max, Math.floor(qty)));
					return { ...line, qty: nextQty };
				})
				.filter((line) => line.qty > 0),
		);
	}, []);

	const removeLine = useCallback((key: string) => {
		setCart((current) => current.filter((line) => line.key !== key));
	}, []);

	const resetForm = useCallback(() => {
		setCart([]);
		setCustomerName("");
		setCustomerPhone("");
		setNotes("");
		setPaymentMethod("cash");
		setReceiptNumber("");
		setDiscountInput("0");
		setTaxInput("0");
	}, []);

	const handleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (!cart.length) {
				setFormErrors({
					form: ["Agrega al menos un producto o combo al carrito."],
				});
				return;
			}

			setFormErrors(null);
			setSuccessMessage(null);

			const currentCart = [...cart];
			const receiptLines: ReceiptLine[] = currentCart.map((line) => ({
				name: line.name,
				qty: line.qty,
				unitPrice: line.unitPrice,
				type: line.type,
			}));

			startTransition(async () => {
				const formData = new FormData();
				if (customerName.trim())
					formData.append("customerName", customerName.trim());
				if (customerPhone.trim())
					formData.append("customerPhone", customerPhone.trim());
				if (notes.trim()) formData.append("notes", notes.trim());
				formData.append("paymentMethod", paymentMethod);
				if (receiptNumber.trim())
					formData.append("receiptNumber", receiptNumber.trim());
				formData.append("currency", currency);
				formData.append("discountAmount", discountAmount.toString());
				formData.append("taxAmount", taxAmount.toString());
				formData.append(
					"productItems",
					JSON.stringify(
						currentCart
							.filter((line) => line.type === "product")
							.map((line) => ({
								productId: line.entityId,
								qty: line.qty,
								unitPrice: line.unitPrice,
							})),
					),
				);
				formData.append(
					"comboItems",
					JSON.stringify(
						currentCart
							.filter((line) => line.type === "combo")
							.map((line) => ({
								comboId: line.entityId,
								qty: line.qty,
								unitPrice: line.unitPrice,
							})),
					),
				);

				const result = await createSaleAction(formData);

				if (!result.success) {
					setFormErrors(result.errors);
					return;
				}

				setFormErrors(null);
				setSuccessMessage(result.message ?? "Venta registrada correctamente.");

				const receiptData: ReceiptData = {
					orderId: result.data.orderId,
					receiptNumber:
						result.data.receiptNumber ??
						`POS-${result.data.orderId.slice(0, 8).toUpperCase()}`,
					createdAt: new Date().toISOString(),
					paymentMethod,
					customerName: customerName.trim() || undefined,
					customerPhone: customerPhone.trim() || undefined,
					notes: notes.trim() || undefined,
					subtotal,
					discount: discountAmount,
					tax: taxAmount,
					total,
					profit: result.data.profitAmount,
					currency,
					items: receiptLines,
				};

				setLastReceipt(receiptData);
				resetForm();

				setSnapshot((current) => ({
					totalRevenue: roundCurrency(current.totalRevenue + total),
					totalProfit: roundCurrency(
						current.totalProfit + result.data.profitAmount,
					),
					todayRevenue: roundCurrency(current.todayRevenue + total),
					todayProfit: roundCurrency(
						current.todayProfit + result.data.profitAmount,
					),
					recent: [
						{
							id: result.data.orderId,
							totalAmount: total,
							profitAmount: result.data.profitAmount,
							paymentMethod,
							createdAt: receiptData.createdAt,
						},
						...current.recent.slice(0, 9),
					],
				}));
			});
		},
		[
			cart,
			currency,
			discountAmount,
			paymentMethod,
			taxAmount,
			total,
			subtotal,
			customerName,
			customerPhone,
			notes,
			receiptNumber,
			resetForm,
		],
	);

	const printReceipt = useCallback(() => {
		if (!lastReceipt || !receiptRef.current) return;

		const printWindow = window.open("", "pos-receipt", "width=720,height=900");
		if (!printWindow) return;

		printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${lastReceipt.receiptNumber}</title>
<style>
body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
h1 { font-size: 20px; margin-bottom: 8px; }
.table { width: 100%; border-collapse: collapse; margin-top: 16px; }
.table th, .table td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
.summary { margin-top: 16px; font-size: 14px; }
</style>
</head>
<body>
${receiptRef.current.innerHTML}
</body>
</html>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
		printWindow.close();
	}, [lastReceipt]);

	return (
		<div className='grid gap-6 lg:grid-cols-[3fr,2fr]'>
			<section className='space-y-4'>
				<header className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<div>
							<h2 className='text-xl font-semibold text-gray-900'>Catálogo</h2>
							<p className='text-sm text-gray-500'>
								Selecciona productos y combos para armar la venta.
							</p>
						</div>
						<input
							type='search'
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder='Buscar producto…'
							className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300 sm:w-72'
						/>
					</div>
				</header>

				<div className='grid gap-4 md:grid-cols-2'>
					{filteredProducts.map((product) => (
						<article
							key={product.id}
							className='flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
							<div className='space-y-1'>
								<h3 className='text-base font-semibold text-gray-900'>
									{product.name}
								</h3>
								<p className='text-sm text-gray-500'>
									Precio: {formatCurrency(product.price, product.currency)}
								</p>
								<p className='text-xs text-gray-400'>
									Existencias: {product.quantity ?? 0}
								</p>
							</div>
							<button
								type='button'
								onClick={() => addProductToCart(product)}
								disabled={product.quantity !== null && product.quantity <= 0}
								className='mt-3 inline-flex items-center justify-center rounded-md bg-blush-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500'>
								Agregar
							</button>
						</article>
					))}
				</div>

				{combos.length ? (
					<div className='space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
						<header className='flex items-center justify-between'>
							<div>
								<h3 className='text-lg font-semibold text-gray-900'>Combos</h3>
								<p className='text-sm text-gray-500'>
									Multiplica tus ventas con paquetes listos.
								</p>
							</div>
						</header>
						<div className='grid gap-4 md:grid-cols-2'>
							{combos.map((combo) => (
								<article
									key={combo.id}
									className='flex flex-col justify-between rounded-lg border border-dashed border-gray-300 bg-blush-50 p-4'>
									<div className='space-y-1'>
										<h4 className='text-base font-semibold text-gray-900'>
											{combo.name}
										</h4>
										<p className='text-sm text-gray-500'>
											Precio sugerido:{" "}
											{formatCurrency(combo.price, combo.currency)}
										</p>
										<ul className='text-xs text-gray-500'>
											{combo.items.map((item) => (
												<li key={`${combo.id}-${item.productId}`}>
													{item.qty}× {item.productName}
												</li>
											))}
										</ul>
									</div>
									<button
										type='button'
										onClick={() => addComboToCart(combo)}
										className='mt-3 inline-flex items-center justify-center rounded-md border border-blush-400 bg-white px-3 py-2 text-sm font-semibold text-blush-600 transition hover:bg-blush-100'>
										Agregar combo
									</button>
								</article>
							))}
						</div>
					</div>
				) : null}
			</section>

			<section className='space-y-4'>
				<form
					onSubmit={handleSubmit}
					className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<header className='flex items-center justify-between'>
						<div>
							<h2 className='text-xl font-semibold text-gray-900'>
								Venta en curso
							</h2>
							<p className='text-sm text-gray-500'>
								Gestiona el carrito, métodos de pago y totales.
							</p>
						</div>
					</header>

					{successMessage ? (
						<div className='rounded-md border border-blush-200 bg-blush-50 px-4 py-2 text-sm text-blush-600'>
							{successMessage}
						</div>
					) : null}

					{formErrors?.form ? (
						<div className='rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600'>
							{formErrors.form.join(" ")}
						</div>
					) : null}

					<div className='space-y-3'>
						{cart.length ? (
							<table className='min-w-full text-sm'>
								<thead>
									<tr className='text-left text-xs uppercase tracking-wide text-gray-500'>
										<th className='pb-2'>Artículo</th>
										<th className='pb-2'>Precio</th>
										<th className='pb-2'>Cantidad</th>
										<th className='pb-2 text-right'>Subtotal</th>
										<th className='pb-2'></th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200'>
									{cart.map((line) => (
										<tr key={line.key}>
											<td className='py-2 font-medium text-gray-900'>
												{line.name}
											</td>
											<td className='py-2 text-gray-600'>
												{formatCurrency(line.unitPrice, currency)}
											</td>
											<td className='py-2'>
												<input
													type='number'
													min={1}
													value={line.qty}
													onChange={(event) =>
														updateQty(line.key, Number(event.target.value))
													}
													className='w-20 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
												/>
												{line.maxQty !== undefined ? (
													<p className='text-xs text-gray-400'>
														Máx: {line.maxQty}
													</p>
												) : null}
											</td>
											<td className='py-2 text-right text-gray-600'>
												{formatCurrency(line.unitPrice * line.qty, currency)}
											</td>
											<td className='py-2 text-right'>
												<button
													type='button'
													onClick={() => removeLine(line.key)}
													className='text-xs font-medium text-red-500 hover:underline'>
													Eliminar
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<p className='text-sm text-gray-500'>
								El carrito está vacío. Agrega productos para comenzar.
							</p>
						)}
					</div>

					<div className='grid gap-3 md:grid-cols-2'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								Cliente
							</label>
							<input
								type='text'
								value={customerName}
								onChange={(event) => setCustomerName(event.target.value)}
								placeholder='Nombre del cliente'
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								Teléfono
							</label>
							<input
								type='tel'
								value={customerPhone}
								onChange={(event) => setCustomerPhone(event.target.value)}
								placeholder='Opcional'
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<label className='text-sm font-medium text-gray-700'>Notas</label>
						<textarea
							rows={2}
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder='Observaciones adicionales para el pedido'
							className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
					</div>

					<div className='grid gap-3 md:grid-cols-2'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								Método de pago
							</label>
							<select
								value={paymentMethod}
								onChange={(event) =>
									setPaymentMethod(event.target.value as PaymentMethod)
								}
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
								<option value='cash'>Efectivo</option>
								<option value='card'>Tarjeta</option>
								<option value='transfer'>Transferencia</option>
							</select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								No. comprobante
							</label>
							<input
								type='text'
								value={receiptNumber}
								onChange={(event) => setReceiptNumber(event.target.value)}
								placeholder='Requerido si la venta es por transferencia'
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
							{paymentMethod === "transfer" && !receiptNumber.trim() ? (
								<p className='text-xs text-red-500'>
									Este campo es obligatorio para transferencias.
								</p>
							) : null}
						</div>
					</div>

					<div className='grid gap-3 md:grid-cols-2'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								Descuento
							</label>
							<input
								type='text'
								value={discountInput}
								onChange={(event) => setDiscountInput(event.target.value)}
								placeholder='0.00'
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-gray-700'>
								Impuesto
							</label>
							<input
								type='text'
								value={taxInput}
								onChange={(event) => setTaxInput(event.target.value)}
								placeholder='0.00'
								className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
							/>
						</div>
					</div>

					<div className='space-y-1 rounded-lg bg-gray-50 p-4 text-sm'>
						<div className='flex items-center justify-between text-gray-600'>
							<span>Subtotal</span>
							<span>{formatCurrency(subtotal, currency)}</span>
						</div>
						<div className='flex items-center justify-between text-gray-600'>
							<span>Descuento</span>
							<span>-{formatCurrency(discountAmount, currency)}</span>
						</div>
						<div className='flex items-center justify-between text-gray-600'>
							<span>Impuesto</span>
							<span>{formatCurrency(taxAmount, currency)}</span>
						</div>
						<div className='mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-lg font-semibold text-gray-900'>
							<span>Total a cobrar</span>
							<span>{formatCurrency(total, currency)}</span>
						</div>
					</div>

					<div className='flex items-center justify-end gap-2'>
						<button
							type='button'
							onClick={resetForm}
							className='inline-flex items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
							Cancelar
						</button>
						<button
							type='submit'
							disabled={!canSubmit}
							className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:opacity-60'>
							{isPending ? "Guardando…" : "Registrar venta"}
						</button>
					</div>
				</form>

				<section className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<header className='flex items-center justify-between'>
						<div>
							<h2 className='text-lg font-semibold text-gray-900'>
								Resumen de ganancias
							</h2>
							<p className='text-sm text-gray-500'>
								Ventas registradas desde este dispositivo.
							</p>
						</div>
					</header>
					<div className='mt-4 grid gap-4 sm:grid-cols-2'>
						<div className='rounded-md border border-gray-200 p-3'>
							<p className='text-xs uppercase tracking-wide text-gray-500'>
								Ventas hoy
							</p>
							<p className='mt-1 text-2xl font-semibold text-gray-900'>
								{formatCurrency(snapshot.todayRevenue, currency)}
							</p>
						</div>
						<div className='rounded-md border border-gray-200 p-3'>
							<p className='text-xs uppercase tracking-wide text-gray-500'>
								Ganancia hoy
							</p>
							<p className='mt-1 text-2xl font-semibold text-gray-900'>
								{formatCurrency(snapshot.todayProfit, currency)}
							</p>
						</div>
						<div className='rounded-md border border-gray-200 p-3'>
							<p className='text-xs uppercase tracking-wide text-gray-500'>
								Ventas totales
							</p>
							<p className='mt-1 text-2xl font-semibold text-gray-900'>
								{formatCurrency(snapshot.totalRevenue, currency)}
							</p>
						</div>
						<div className='rounded-md border border-gray-200 p-3'>
							<p className='text-xs uppercase tracking-wide text-gray-500'>
								Ganancia acumulada
							</p>
							<p className='mt-1 text-2xl font-semibold text-gray-900'>
								{formatCurrency(snapshot.totalProfit, currency)}
							</p>
						</div>
					</div>

					{snapshot.recent.length ? (
						<div className='mt-4'>
							<h3 className='text-sm font-semibold text-gray-900'>
								Últimas ventas
							</h3>
							<ul className='mt-2 space-y-1 text-sm text-gray-600'>
								{snapshot.recent.slice(0, 5).map((sale) => (
									<li
										key={sale.id}
										className='flex items-center justify-between'>
										<span>
											{new Intl.DateTimeFormat("es-NI", {
												dateStyle: "short",
												timeStyle: "short",
											}).format(new Date(sale.createdAt))}
										</span>
										<span>{formatCurrency(sale.totalAmount, currency)}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</section>

				{lastReceipt ? (
					<section className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
						<header className='flex items-center justify-between'>
							<div>
								<h2 className='text-lg font-semibold text-gray-900'>
									Último recibo
								</h2>
								<p className='text-sm text-gray-500'>
									Imprime o comparte el comprobante con tu cliente.
								</p>
							</div>
							<button
								type='button'
								onClick={printReceipt}
								className='inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
								Imprimir recibo
							</button>
						</header>
						<div ref={receiptRef} className='mt-4 text-sm text-gray-700'>
							<h3 className='text-base font-semibold text-gray-900'>
								Inventario Girlee
							</h3>
							<p className='text-xs text-gray-500'>
								Recibo #{lastReceipt.receiptNumber}
							</p>
							<p className='text-xs text-gray-500'>
								Fecha:{" "}
								{new Intl.DateTimeFormat("es-NI", {
									dateStyle: "medium",
									timeStyle: "short",
								}).format(new Date(lastReceipt.createdAt))}
							</p>
							{lastReceipt.customerName ? (
								<p className='mt-2 text-sm text-gray-600'>
									Cliente: {lastReceipt.customerName}
								</p>
							) : null}
							<table className='mt-3 w-full text-left text-xs'>
								<thead>
									<tr className='text-gray-500'>
										<th className='pb-2'>Artículo</th>
										<th className='pb-2'>Cant.</th>
										<th className='pb-2 text-right'>Precio</th>
									</tr>
								</thead>
								<tbody>
									{lastReceipt.items.map((item, index) => (
										<tr key={`${item.name}-${index}`}>
											<td className='py-1'>{item.name}</td>
											<td className='py-1'>{item.qty}</td>
											<td className='py-1 text-right'>
												{formatCurrency(
													item.unitPrice * item.qty,
													lastReceipt.currency,
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<div className='mt-3 space-y-1 text-xs text-gray-600'>
								<p>
									Subtotal:{" "}
									{formatCurrency(lastReceipt.subtotal, lastReceipt.currency)}
								</p>
								<p>
									Descuento:{" "}
									{formatCurrency(lastReceipt.discount, lastReceipt.currency)}
								</p>
								<p>
									Impuesto:{" "}
									{formatCurrency(lastReceipt.tax, lastReceipt.currency)}
								</p>
								<p className='text-sm font-semibold text-gray-900'>
									Total:{" "}
									{formatCurrency(lastReceipt.total, lastReceipt.currency)}
								</p>
								<p className='text-xs text-gray-500'>
									Método: {lastReceipt.paymentMethod}
								</p>
								<p className='text-xs text-gray-500'>
									Ganancia de la venta:{" "}
									{formatCurrency(lastReceipt.profit, lastReceipt.currency)}
								</p>
							</div>
							{lastReceipt.notes ? (
								<p className='mt-2 text-xs text-gray-500'>
									Notas: {lastReceipt.notes}
								</p>
							) : null}
						</div>
					</section>
				) : null}
			</section>
		</div>
	);
}
