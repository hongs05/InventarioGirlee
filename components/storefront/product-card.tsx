"use client";

import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import type { StorefrontProduct } from "@/lib/storefront/types";

type ProductCardProps = {
	product: StorefrontProduct;
};

const currencyFormatter = new Intl.NumberFormat("es-NI", {
	style: "currency",
	currency: "NIO",
});

function formatCurrency(value: number | null | undefined, currency: string) {
	if (!value || Number.isNaN(value)) {
		return null;
	}

	try {
		return new Intl.NumberFormat("es-NI", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
		}).format(value);
	} catch (error) {
		console.warn("[storefront/product-card] Could not format currency", error);
		return currencyFormatter.format(value);
	}
}

function resolveAvailability(quantity: number | null | undefined) {
	if (quantity === null || quantity === undefined) {
		return { label: "Consulta disponibilidad", tone: "info" as const };
	}

	if (quantity <= 0) {
		return { label: "Agotado", tone: "danger" as const };
	}

	if (quantity <= 5) {
		return { label: "Quedan pocas unidades", tone: "warning" as const };
	}

	return { label: "En stock", tone: "success" as const };
}

export function ProductCard({ product }: ProductCardProps) {
	const priceLabel = formatCurrency(product.sellPrice, product.currency);
	const availability = resolveAvailability(product.quantity ?? null);

	return (
		<article className='group flex h-full flex-col overflow-hidden rounded-4xl border border-white/60 bg-white/80 shadow-soft transition hover:-translate-y-1 hover:shadow-lg'>
			<Link
				href={`/products/${product.slug}`}
				className='relative block aspect-square overflow-hidden bg-blush-50/70'>
				<div className='absolute inset-0 bg-linear-to-br from-white/40 via-transparent to-blush-50 opacity-0 transition duration-300 group-hover:opacity-100' />
				{product.imageUrl ? (
					<Image
						src={product.imageUrl}
						alt={product.name}
						fill
						sizes='(min-width: 1280px) 320px, (min-width: 768px) 33vw, 100vw'
						className='object-cover transition duration-300 ease-out group-hover:scale-105'
					/>
				) : (
					<div className='absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400'>
						Sin imagen
					</div>
				)}
				{product.badges?.length ? (
					<div className='absolute left-4 top-4 flex flex-wrap gap-2'>
						{product.badges.map((badge) => (
							<span
								key={badge}
								className='rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blush-600 shadow-sm backdrop-blur'>
								{badge}
							</span>
						))}
					</div>
				) : null}
			</Link>
			<div className='flex flex-1 flex-col gap-4 px-5 py-6 text-gray-900'>
				<div>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
						{product.brand ?? "Descubre"}
					</p>
					<h3 className='brand-heading mt-1 line-clamp-2 text-2xl leading-tight text-gray-900'>
						{product.name}
					</h3>
				</div>
				{product.description ? (
					<p className='line-clamp-2 text-sm text-gray-600'>
						{product.description}
					</p>
				) : null}
				<div className='mt-auto space-y-4'>
					<div className='flex items-center justify-between gap-3'>
						{priceLabel ? (
							<p className='text-gradient-blush text-xl font-semibold'>
								{priceLabel}
							</p>
						) : (
							<p className='text-sm font-medium text-gray-500'>
								Precio a consultar
							</p>
						)}
						<span
							className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
								availability.tone === "success"
									? "bg-emerald-50 text-emerald-700"
									: availability.tone === "warning"
									? "bg-amber-50 text-amber-700"
									: availability.tone === "danger"
									? "bg-gray-100 text-gray-600"
									: "bg-blush-50 text-blush-600"
							}`}>
							{availability.label}
						</span>
					</div>
					<div className='flex flex-wrap gap-3'>
						<AddToCartButton
							product={{
								id: product.id,
								slug: product.slug,
								name: product.name,
								currency: product.currency,
								price: product.sellPrice,
								imageUrl: product.imageUrl ?? null,
							}}
							size='sm'
							variant='primary'
							className='flex-1 justify-center sm:flex-none'
						/>
						<Link
							href={`/products/${product.slug}`}
							className='inline-flex flex-1 items-center justify-center rounded-full border border-blush-200/70 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-white sm:flex-none'>
							Ver detalles
						</Link>
					</div>
				</div>
			</div>
		</article>
	);
}
