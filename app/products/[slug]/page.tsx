import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";
import {
	fetchProductDetail,
	listActiveProducts,
} from "@/lib/storefront/products";

const currencyFormatter = new Intl.NumberFormat("es-NI", {
	style: "currency",
	currency: "NIO",
	minimumFractionDigits: 2,
});

type ProductPageProps = {
	params: { slug: string };
};

export async function generateMetadata({
	params,
}: ProductPageProps): Promise<Metadata> {
	const product = await fetchProductDetail(params.slug);
	if (!product) {
		return {
			title: "Producto no disponible · Inventario Girlee",
			description: "El producto que buscas ya no está disponible.",
		};
	}

	return {
		title: `${product.name} · Inventario Girlee`,
		description:
			product.description ??
			"Descubre la curaduría consciente de Inventario Girlee con asesoría personalizada para cada compra.",
		openGraph: {
			title: `${product.name} · Inventario Girlee`,
			description:
				product.description ??
				"Descubre la curaduría consciente de Inventario Girlee con asesoría personalizada para cada compra.",
		},
	};
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
	const product = await fetchProductDetail(params.slug);
	if (!product) {
		notFound();
	}

	const related = await listActiveProducts({
		limit: 4,
		categoryId: product.categoryId ?? undefined,
		includeOutOfStock: true,
	});

	const relatedProducts = related.filter((item) => item.id !== product.id);

	const priceLabel =
		product.sellPrice !== null && product.sellPrice !== undefined
			? currencyFormatter.format(product.sellPrice)
			: null;

	const availability = resolveAvailability(product.quantity ?? null);

	return (
		<SiteShell>
			<article className='space-y-16'>
				<section className='grid gap-10 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'>
					<ProductGallery product={product} />
					<div className='space-y-6 text-gray-800'>
						<div className='space-y-3'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								{product.brand ?? product.category ?? "Inventario Girlee"}
							</p>
							<h1 className='text-3xl font-semibold text-gray-900 sm:text-4xl'>
								{product.name}
							</h1>
							{product.description ? (
								<p className='text-base leading-relaxed text-gray-600'>
									{product.description}
								</p>
							) : null}
						</div>

						<div className='rounded-2xl border border-blush-100 bg-white/60 p-6 shadow-inner'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								Precio
							</p>
							<p className='mt-3 text-3xl font-semibold text-gray-900'>
								{priceLabel ?? "Contáctanos"}
							</p>
							<p className='mt-2 text-sm text-gray-500'>
								Incluye asesoría personalizada y recordatorios para tu
								reposición.
							</p>
							<span
								className={`mt-4 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
									availability.tone === "success"
										? "bg-emerald-100 text-emerald-700"
										: availability.tone === "warning"
										? "bg-amber-100 text-amber-700"
										: availability.tone === "danger"
										? "bg-gray-200 text-gray-600"
										: "bg-blush-100 text-blush-600"
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
								size='lg'
								className='flex-1 justify-center sm:flex-none'
							/>
							<Link
								href='/cart'
								className='inline-flex items-center justify-center rounded-full border border-blush-300 px-4 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-100'>
								Ver carrito
							</Link>
							<Link
								href='/contact'
								className='inline-flex items-center justify-center rounded-full border border-transparent px-4 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-50'>
								Asesoría personalizada
							</Link>
						</div>

						{product.attributes?.length ? (
							<div className='space-y-3 text-sm text-gray-600'>
								<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Detalles
								</p>
								<dl className='grid gap-3 sm:grid-cols-2'>
									{product.attributes.map((attribute) => (
										<div key={`${attribute.label}-${attribute.value}`}>
											<dt className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
												{formatAttributeLabel(attribute.label)}
											</dt>
											<dd className='mt-1 text-sm text-gray-700'>
												{attribute.value}
											</dd>
										</div>
									))}
								</dl>
							</div>
						) : null}
					</div>
				</section>

				<section className='space-y-6'>
					<SectionHeader
						title='Puede interesarte'
						subtitle='Más tesoros curados por Girlee para complementar tu rutina.'
					/>
					{relatedProducts.length ? (
						<div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4'>
							{relatedProducts.map((relatedProduct) => (
								<ProductCard key={relatedProduct.id} product={relatedProduct} />
							))}
						</div>
					) : (
						<div className='rounded-2xl border border-dashed border-blush-200 bg-white/70 p-10 text-center text-sm text-gray-500'>
							Explora nuestro catálogo para encontrar más productos compatibles
							con tu estilo.
						</div>
					)}
				</section>
			</article>
		</SiteShell>
	);
}

type ProductGalleryProps = {
	product: NonNullable<Awaited<ReturnType<typeof fetchProductDetail>>>;
};

function ProductGallery({ product }: ProductGalleryProps) {
	const mainImage = product?.imageUrl ?? null;
	const gallery = product?.gallery ?? [];
	const galleryImages = mainImage
		? [mainImage, ...gallery.filter((image) => image !== mainImage)]
		: gallery;

	if (!galleryImages.length) {
		return (
			<div className='flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-blush-200 bg-blush-50/70 text-sm text-gray-500'>
				Aún no tenemos fotografías para este producto.
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<div className='relative aspect-square overflow-hidden rounded-3xl border border-blush-100 bg-white/80 shadow-sm'>
				<Image
					src={galleryImages[0]}
					alt={product?.name ?? "Producto"}
					fill
					sizes='(min-width: 1280px) 560px, 100vw'
					className='object-cover'
				/>
			</div>
			{galleryImages.length > 1 ? (
				<div className='grid grid-cols-3 gap-3'>
					{galleryImages.slice(1, 4).map((image) => (
						<div
							key={image}
							className='relative aspect-square overflow-hidden rounded-2xl border border-blush-100 bg-white/60 shadow-inner'>
							<Image
								src={image}
								alt={product?.name ?? "Producto"}
								fill
								sizes='200px'
								className='object-cover'
							/>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

type AvailabilityTone = "success" | "warning" | "danger" | "info";

type Availability = {
	label: string;
	tone: AvailabilityTone;
};

function resolveAvailability(
	quantity: number | null | undefined,
): Availability {
	if (quantity === null || quantity === undefined) {
		return { label: "Consulta disponibilidad", tone: "info" };
	}

	if (quantity <= 0) {
		return { label: "Agotado", tone: "danger" };
	}

	if (quantity <= 5) {
		return { label: "Quedan pocas unidades", tone: "warning" };
	}

	return { label: "En stock", tone: "success" };
}

function formatAttributeLabel(label: string) {
	return label
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase()
		.replace(/^(\w)/, (match) => match.toUpperCase());
}
