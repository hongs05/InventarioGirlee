"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart, type CartItem } from "@/components/storefront/cart-context";
import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";

function formatLinePrice(item: CartItem) {
	if (item.price === null) {
		return "Coordinar";
	}
	try {
		return new Intl.NumberFormat("es-NI", {
			style: "currency",
			currency: item.currency,
			minimumFractionDigits: 2,
		}).format(item.price * item.quantity);
	} catch (error) {
		console.warn("[cart] Unable to format line price", error);
		return `${item.price * item.quantity} ${item.currency}`;
	}
}

function formatPrice(value: number, currency: string) {
	try {
		return new Intl.NumberFormat("es-NI", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
		}).format(value);
	} catch (error) {
		console.warn("[cart] Unable to format price", error);
		return `${value} ${currency}`;
	}
}

export default function CartPage() {
	const {
		items,
		itemCount,
		subtotal,
		hasItemsWithoutPrice,
		isHydrated,
		updateQuantity,
		removeItem,
		clearCart,
	} = useCart();

	const handleDecrement = (item: CartItem) => {
		updateQuantity(item.id, Math.max(1, item.quantity - 1));
	};

	const handleIncrement = (item: CartItem) => {
		updateQuantity(item.id, Math.min(99, item.quantity + 1));
	};

	const emptyState = (
		<section className='mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-blush-100 bg-white/80 p-12 text-center text-gray-600 shadow-sm'>
			<p className='text-2xl font-semibold text-gray-900'>
				Tu carrito está vacío por ahora
			</p>
			<p className='max-w-md text-sm'>
				Descubre nuevos productos y combos diseñados para consentirte. Cuando
				añadas algo, aparecerá aquí para coordinar tu entrega.
			</p>
			<div className='flex flex-wrap justify-center gap-3'>
				<Link
					href='/products'
					className='inline-flex items-center rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blush-400'>
					Ir al catálogo
				</Link>
				<Link
					href='/store-care'
					className='inline-flex items-center rounded-full border border-blush-300 px-5 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-100/70'>
					Conoce nuestra experiencia
				</Link>
			</div>
		</section>
	);

	return (
		<SiteShell>
			<section className='space-y-10'>
				<SectionHeader
					title='Tu carrito Girlee'
					subtitle='Resume tus selecciones, ajusta cantidades y coordina el siguiente paso de tu experiencia personalizada.'
					action={
						itemCount ? (
							<button
								type='button'
								onClick={clearCart}
								className='inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blush-500 transition hover:border-blush-300 hover:bg-blush-100/60'>
								Vaciar carrito
							</button>
						) : undefined
					}
				/>

				{!itemCount && isHydrated ? (
					emptyState
				) : (
					<div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.4fr)]'>
						<div className='space-y-4'>
							{items.map((item) => (
								<article
									key={item.id}
									className='flex flex-col gap-4 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm sm:flex-row sm:items-center'>
									<div className='relative h-28 w-28 overflow-hidden rounded-2xl border border-blush-100 bg-blush-50/70'>
										{item.imageUrl ? (
											<Image
												src={item.imageUrl}
												alt={item.name}
												fill
												sizes='112px'
												className='object-cover'
											/>
										) : (
											<div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
												Sin imagen
											</div>
										)}
									</div>
									<div className='flex flex-1 flex-col gap-2 text-sm text-gray-600'>
										<div>
											<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
												Producto
											</p>
											<Link
												href={`/products/${item.slug}`}
												className='text-base font-semibold text-gray-900 underline-offset-2 hover:underline'>
												{item.name}
											</Link>
										</div>
										<div className='flex flex-wrap items-center gap-4'>
											<div className='inline-flex items-center rounded-full border border-blush-200 bg-white px-2 py-1 text-xs font-semibold text-blush-600 shadow-sm'>
												{item.price === null
													? "Precio a coordinar"
													: formatPrice(item.price, item.currency)}
											</div>
											<div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500'>
												Cantidad
											</div>
											<div className='flex items-center gap-2 rounded-full border border-blush-200 bg-white px-2 py-1 shadow-inner'>
												<button
													type='button'
													className='inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-blush-600 hover:bg-blush-100'
													onClick={() => handleDecrement(item)}
													aria-label='Disminuir cantidad'>
													-
												</button>
												<span className='min-w-8 text-center text-sm font-semibold text-gray-900'>
													{item.quantity}
												</span>
												<button
													type='button'
													className='inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-blush-600 hover:bg-blush-100'
													onClick={() => handleIncrement(item)}
													aria-label='Aumentar cantidad'>
													+
												</button>
											</div>
										</div>
									</div>
									<div className='flex flex-col items-start gap-3 text-sm font-semibold text-gray-900 sm:items-end'>
										<p>{formatLinePrice(item)}</p>
										<button
											type='button'
											onClick={() => removeItem(item.id)}
											className='text-xs font-semibold uppercase tracking-[0.2em] text-blush-500 transition hover:text-blush-400'>
											Quitar
										</button>
									</div>
								</article>
							))}
						</div>
						<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm'>
							<h2 className='text-lg font-semibold text-gray-900'>Resumen</h2>
							<div className='space-y-3 text-sm text-gray-600'>
								<div className='flex items-center justify-between'>
									<span>Artículos</span>
									<span className='font-semibold text-gray-900'>
										{itemCount}
									</span>
								</div>
								<div className='flex items-center justify-between'>
									<span>Subtotal estimado</span>
									<span className='text-base font-semibold text-gray-900'>
										{formatPrice(subtotal, items[0]?.currency ?? "NIO")}
									</span>
								</div>
								{hasItemsWithoutPrice ? (
									<p className='text-xs text-gray-500'>
										Algunos productos requieren confirmación de precio. Te
										contactaremos antes de cerrar tu pedido.
									</p>
								) : null}
							</div>
							<div className='space-y-3'>
								<Link
									href='/checkout'
									className='inline-flex w-full items-center justify-center rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blush-400'>
									Reservar ahora
								</Link>
								<Link
									href='/products'
									className='inline-flex w-full items-center justify-center rounded-full border border-blush-300 px-5 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-100/70'>
									Seguir explorando
								</Link>
							</div>
							<p className='text-xs text-gray-500'>
								Coordinamos pagos y entregas por WhatsApp, transferencia o
								contraentrega según disponibilidad. Si necesitas ayuda
								inmediata,{" "}
								<Link
									href='/contact'
									className='font-semibold text-blush-500 transition hover:text-blush-600'>
									contáctanos
								</Link>
								.
							</p>
						</div>
					</div>
				)}
			</section>
		</SiteShell>
	);
}
