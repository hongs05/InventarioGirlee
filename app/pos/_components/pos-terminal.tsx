"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import type { ActionErrorRecord } from "@/lib/actions";
import { createSaleAction } from "../actions";

type PaymentMethod = "cash" | "card" | "transfer";

type PosProduct = {
	id: string;
	name: string;
	sku: string | null;
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

type ProductSortOption = "nameAZ" | "priceLowHigh" | "priceHighLow";

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

function formatPaymentMethod(method: PaymentMethod) {
	const labels: Record<PaymentMethod, string> = {
		cash: "Efectivo",
		card: "Tarjeta",
		transfer: "Transferencia",
	};

	return labels[method] ?? method;
}

function formatReceiptDate(isoDate: string) {
	return new Intl.DateTimeFormat("es-NI", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(isoDate));
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
	const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
	const [productSort, setProductSort] = useState<ProductSortOption>("nameAZ");
	const [formErrors, setFormErrors] = useState<ActionErrorRecord | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
	const [snapshot, setSnapshot] = useState<EarningsSnapshot>(earnings);
	const receiptRef = useRef<HTMLDivElement | null>(null);
	const saleSectionRef = useRef<HTMLElement | null>(null);
	const catalogSectionRef = useRef<HTMLElement | null>(null);
	const receiptSectionRef = useRef<HTMLElement | null>(null);

	const scrollToSection = useCallback((section: HTMLElement | null) => {
		if (!section) return;
		section.scrollIntoView({ behavior: "smooth", block: "start" });
	}, []);

	const normalizedSearch = search.trim().toLowerCase();
	const hasSearchTerm = normalizedSearch.length > 0;

	const filteredProducts = useMemo(() => {
		if (!hasSearchTerm) return [];

		const matching = products.filter((product) => {
			const matchByName = product.name.toLowerCase().includes(normalizedSearch);
			const matchBySku = product.sku
				? product.sku.toLowerCase().includes(normalizedSearch)
				: false;
			const matchesSearch = matchByName || matchBySku;
			if (!matchesSearch) return false;

			const hasInventory = !showOnlyAvailable
				? true
				: product.quantity === null || (product.quantity ?? 0) > 0;
			return hasInventory;
		});

		const sorted = [...matching];
		switch (productSort) {
			case "priceLowHigh":
				sorted.sort((a, b) => a.price - b.price);
				break;
			case "priceHighLow":
				sorted.sort((a, b) => b.price - a.price);
				break;
			default:
				sorted.sort((a, b) => a.name.localeCompare(b.name));
		}

		return sorted;
	}, [
		hasSearchTerm,
		normalizedSearch,
		productSort,
		products,
		showOnlyAvailable,
	]);

	const filteredCombos = useMemo(() => {
		if (!hasSearchTerm) return [];

		return combos.filter((combo) =>
			combo.name.toLowerCase().includes(normalizedSearch),
		);
	}, [combos, hasSearchTerm, normalizedSearch]);

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

		const receiptMarkup = receiptRef.current.innerHTML;
		const printStyles = `
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

		printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${lastReceipt.receiptNumber}</title>
<style>${printStyles}</style>
</head>
<body>
${receiptMarkup}
</body>
</html>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
		printWindow.close();
	}, [lastReceipt]);

	return (
		<div className='space-y-4 lg:space-y-6'>
			<div className='lg:hidden'>
				<nav
					aria-label='Navegación de la terminal'
					className='sticky top-0 z-20 flex gap-2 overflow-x-auto rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur'>
					<button
						type='button'
						onClick={() => scrollToSection(saleSectionRef.current)}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-full bg-blush-500 px-3 py-1.5 text-white shadow transition hover:bg-blush-400'>
						Venta
					</button>
					<button
						type='button'
						onClick={() => scrollToSection(catalogSectionRef.current)}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 shadow-inner transition hover:bg-gray-200'>
						Catálogo
					</button>
					<button
						type='button'
						onClick={() => scrollToSection(receiptSectionRef.current)}
						disabled={!lastReceipt}
						className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 shadow-inner transition ${
							lastReceipt
								? "bg-gray-100 text-gray-700 hover:bg-gray-200"
								: "cursor-not-allowed bg-gray-100 text-gray-400"
						}`}>
						Recibos
					</button>
				</nav>
			</div>
			<div className='grid gap-6 lg:grid-cols-[3fr,2fr] lg:items-start'>
				<section
					ref={catalogSectionRef}
					className='order-2 space-y-4 lg:order-1 lg:space-y-6'>
					<header className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
						<div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
							<div>
								<h2 className='text-xl font-semibold text-gray-900'>
									Catálogo
								</h2>
								<p className='text-sm text-gray-500'>
									Selecciona productos y combos para armar la venta.
								</p>
							</div>
							<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
								<div className='relative w-full sm:max-w-md'>
									<input
										type='search'
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder='Buscar producto…'
										className='w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
										aria-label='Buscar en catálogo'
									/>
									{search ? (
										<button
											type='button'
											onClick={() => setSearch("")}
											className='absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-gray-400 hover:text-gray-600'>
											Limpiar
										</button>
									) : null}
								</div>
								<div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
									<button
										type='button'
										onClick={() => setShowOnlyAvailable((value) => !value)}
										aria-pressed={showOnlyAvailable}
										className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blush-300 focus:ring-offset-1 ${
											showOnlyAvailable
												? "border-blush-500 bg-blush-50 text-blush-600"
												: "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
										}`}>
										{showOnlyAvailable ? "Solo disponibles" : "Ver todo"}
									</button>
									<select
										value={productSort}
										onChange={(event) =>
											setProductSort(event.target.value as ProductSortOption)
										}
										className='rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
										<option value='nameAZ'>Ordenar A-Z</option>
										<option value='priceLowHigh'>Precio: menor a mayor</option>
										<option value='priceHighLow'>Precio: mayor a menor</option>
									</select>
								</div>
							</div>
						</div>
					</header>

					<div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500'>
						<p className='font-medium text-gray-600'>
							{filteredProducts.length} producto
							{filteredProducts.length === 1 ? "" : "s"} listados
						</p>
						{showOnlyAvailable ? (
							<p>Mostrando solo artículos con existencias disponibles.</p>
						) : null}
					</div>

					{hasSearchTerm && filteredProducts.length ? (
						<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
							{filteredProducts.map((product) => {
								const managedInventory = product.quantity !== null;
								const qty = product.quantity ?? 0;
								const isOutOfStock = managedInventory && qty <= 0;
								const isLowStock = managedInventory && qty > 0 && qty <= 5;
								const profit = product.price - product.cost;
								const cardStateClass = isOutOfStock
									? "border-red-200 bg-red-50/60"
									: "border-gray-200";
								const badgeClass = isOutOfStock
									? "bg-red-100 text-red-700"
									: isLowStock
									? "bg-amber-100 text-amber-700"
									: "bg-emerald-100 text-emerald-700";
								const badgeLabel = isOutOfStock
									? "Sin existencias"
									: isLowStock
									? `Bajas (${qty})`
									: `Stock: ${qty}`;

								return (
									<article
										key={product.id}
										className={`flex h-full flex-col justify-between rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardStateClass}`}>
										<div className='space-y-3'>
											<header className='flex items-start justify-between gap-2'>
												<h3 className='text-base font-semibold text-gray-900'>
													{product.name}
												</h3>
												{managedInventory ? (
													<span
														className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
														{badgeLabel}
													</span>
												) : null}
											</header>
											<div className='space-y-1 text-sm text-gray-600'>
												<p>
													Precio:{" "}
													{formatCurrency(product.price, product.currency)}
												</p>
												<p>
													Ganancia esperada:{" "}
													{formatCurrency(profit, product.currency)}
												</p>
											</div>
										</div>
										<button
											type='button'
											onClick={() => addProductToCart(product)}
											disabled={isOutOfStock}
											className='mt-4 inline-flex items-center justify-center rounded-md bg-blush-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500'>
											Agregar al carrito
										</button>
									</article>
								);
							})}
						</div>
					) : (
						<div className='rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center shadow-sm'>
							<h3 className='text-base font-semibold text-gray-900'>
								Sin resultados
							</h3>
							<p className='mt-2 text-sm text-gray-500'>
								No encontramos productos que coincidan con tu búsqueda o
								filtros.
							</p>
							<button
								type='button'
								onClick={() => {
									setSearch("");
									setShowOnlyAvailable(false);
								}}
								className='mt-4 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100'>
								Reiniciar filtros
							</button>
						</div>
					)}

					{combos.length ? (
						<div className='space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
							<header className='flex items-center justify-between'>
								<div>
									<h3 className='text-lg font-semibold text-gray-900'>
										Combos
									</h3>
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

				<section
					ref={saleSectionRef}
					className='order-1 space-y-4 lg:order-2 lg:space-y-6'>
					<form
						onSubmit={handleSubmit}
						aria-busy={isPending}
						className='relative space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-4'>
						{isPending ? (
							<div
								role='status'
								aria-live='polite'
								className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/70 text-sm font-medium text-gray-600 backdrop-blur'>
								<span className='inline-flex items-center gap-2'>
									<span className='h-3 w-3 animate-spin rounded-full border-2 border-blush-400 border-t-transparent' />
									Guardando venta…
								</span>
								<p className='text-xs text-gray-500'>
									No cierres esta ventana.
								</p>
							</div>
						) : null}

						<fieldset className='space-y-4' disabled={isPending}>
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
									<>
										<div className='hidden md:block'>
											<div className='overflow-hidden rounded-lg border border-gray-200'>
												<table className='min-w-full divide-y divide-gray-200 text-sm'>
													<thead>
														<tr className='bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500'>
															<th className='px-3 py-2'>Artículo</th>
															<th className='px-3 py-2'>Precio</th>
															<th className='px-3 py-2'>Cantidad</th>
															<th className='px-3 py-2 text-right'>Subtotal</th>
															<th className='px-3 py-2' aria-hidden />
														</tr>
													</thead>
													<tbody className='divide-y divide-gray-200'>
														{cart.map((line) => (
															<tr key={line.key}>
																<td className='px-3 py-2 font-medium text-gray-900'>
																	{line.name}
																</td>
																<td className='px-3 py-2 text-gray-600'>
																	{formatCurrency(line.unitPrice, currency)}
																</td>
																<td className='px-3 py-2'>
																	<input
																		type='number'
																		min={1}
																		value={line.qty}
																		onChange={(event) =>
																			updateQty(
																				line.key,
																				Number(event.target.value),
																			)
																		}
																		className='w-20 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
																	/>
																	{line.maxQty !== undefined ? (
																		<p className='mt-1 text-xs text-gray-400'>
																			Máx: {line.maxQty}
																		</p>
																	) : null}
																</td>
																<td className='px-3 py-2 text-right text-gray-600'>
																	{formatCurrency(
																		line.unitPrice * line.qty,
																		currency,
																	)}
																</td>
																<td className='px-3 py-2 text-right'>
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
											</div>
										</div>

										<div className='space-y-2 md:hidden'>
											{cart.map((line) => (
												<div
													key={`${line.key}-mobile`}
													className='rounded-lg border border-gray-200 bg-white p-3 shadow-sm'>
													<header className='flex items-start justify-between gap-4'>
														<div>
															<p className='text-sm font-semibold text-gray-900'>
																{line.name}
															</p>
															<p className='text-xs text-gray-500'>
																{formatCurrency(line.unitPrice, currency)} c/u
															</p>
														</div>
														<button
															type='button'
															onClick={() => removeLine(line.key)}
															className='text-xs font-semibold text-red-500 hover:underline'>
															Eliminar
														</button>
													</header>
													<div className='mt-2 flex items-center justify-between'>
														<div className='flex items-center gap-2'>
															<label
																htmlFor={`qty-${line.key}`}
																className='text-xs font-medium text-gray-600'>
																Cantidad
															</label>
															<input
																id={`qty-${line.key}`}
																type='number'
																min={1}
																value={line.qty}
																onChange={(event) =>
																	updateQty(
																		line.key,
																		Number(event.target.value),
																	)
																}
																className='w-20 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
															/>
														</div>
														<p className='text-sm font-semibold text-gray-900'>
															{formatCurrency(
																line.unitPrice * line.qty,
																currency,
															)}
														</p>
													</div>
													{line.maxQty !== undefined ? (
														<p className='mt-2 text-xs text-gray-400'>
															Máx: {line.maxQty}
														</p>
													) : null}
												</div>
											))}
										</div>
									</>
								) : (
									<p className='rounded-md border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500'>
										El carrito está vacío. Busca en el catálogo o agrega un
										combo para iniciar la venta.
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
								<label className='text-sm font-medium text-gray-700'>
									Notas
								</label>
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
						</fieldset>
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
						<section
							ref={receiptSectionRef}
							className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
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
											<span>#{lastReceipt.receiptNumber}</span>
										</div>
										<div className='thermal-meta__line'>
											<span>Fecha</span>
											<span>{formatReceiptDate(lastReceipt.createdAt)}</span>
										</div>
										{lastReceipt.customerName ? (
											<div className='thermal-meta__line'>
												<span>Cliente</span>
												<span>{lastReceipt.customerName}</span>
											</div>
										) : null}
										{lastReceipt.customerPhone ? (
											<div className='thermal-meta__line'>
												<span>Teléfono</span>
												<span>{lastReceipt.customerPhone}</span>
											</div>
										) : null}
										<div className='thermal-meta__line'>
											<span>Pago</span>
											<span>
												{formatPaymentMethod(lastReceipt.paymentMethod)}
											</span>
										</div>
									</div>
									<div className='thermal-receipt__divider' />
									<table className='thermal-table'>
										<thead>
											<tr>
												<th>Artículo</th>
												<th>Cant.</th>
												<th>Importe</th>
											</tr>
										</thead>
										<tbody>
											{lastReceipt.items.map((item, index) => (
												<tr key={`${item.name}-${index}`}>
													<td>{item.name}</td>
													<td>{item.qty}</td>
													<td>
														{formatCurrency(
															item.unitPrice * item.qty,
															lastReceipt.currency,
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
									<div className='thermal-summary'>
										<div className='thermal-summary-row'>
											<span>Subtotal</span>
											<span>
												{formatCurrency(
													lastReceipt.subtotal,
													lastReceipt.currency,
												)}
											</span>
										</div>
										<div className='thermal-summary-row'>
											<span>Descuento</span>
											<span>
												{lastReceipt.discount > 0
													? formatCurrency(
															-lastReceipt.discount,
															lastReceipt.currency,
													  )
													: formatCurrency(0, lastReceipt.currency)}
											</span>
										</div>
										<div className='thermal-summary-row'>
											<span>Impuesto</span>
											<span>
												{formatCurrency(lastReceipt.tax, lastReceipt.currency)}
											</span>
										</div>
										<div className='thermal-summary-row is-total'>
											<span>Total</span>
											<span>
												{formatCurrency(
													lastReceipt.total,
													lastReceipt.currency,
												)}
											</span>
										</div>
										<div className='thermal-summary-row is-accent'>
											<span>Ganancia</span>
											<span>
												{formatCurrency(
													lastReceipt.profit,
													lastReceipt.currency,
												)}
											</span>
										</div>
									</div>
									{lastReceipt.notes ? (
										<div className='thermal-notes'>
											<strong>Notas:</strong> {lastReceipt.notes}
										</div>
									) : null}
									<div className='thermal-footer'>
										<p>¡Gracias por su compra!</p>
										<p>@InventarioGirlee</p>
									</div>
								</div>
							</div>
						</section>
					) : null}
				</section>
			</div>
		</div>
	);
}
