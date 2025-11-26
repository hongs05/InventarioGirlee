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
});

type ProductRouteParams = { slug: string };

type ProductPageProps = {
	params: ProductRouteParams | Promise<ProductRouteParams>;
};

export async function generateMetadata({
	params,
}: ProductPageProps): Promise<Metadata> {
	const { slug } = await params;
	const product = await fetchProductDetail(slug);

	if (!product) {
		return {
			title: "Producto no disponible · Inventario Girlee",
			description: "El producto que buscas ya no está disponible.",
		};
	}

	const description =
		product.description ??
		"Descubre la curaduría consciente de Inventario Girlee con asesoría personalizada para cada compra.";

	return {
		title: `${product.name} · Inventario Girlee`,
		description,
		openGraph: {
			title: `${product.name} · Inventario Girlee`,
			description,
			images: product.imageUrl ? [product.imageUrl] : undefined,
		},
	};
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
	const { slug } = await params;
	const product = await fetchProductDetail(slug);

	if (!product) {
		notFound();
	}

	const related = await listActiveProducts({
		limit: 4,
		includeOutOfStock: true,
		...(typeof product.categoryId === "number"
			? { categoryId: product.categoryId }
			: {}),
	});

	const relatedProducts = related
		.filter((relatedProduct) => relatedProduct.id !== product.id)
		.slice(0, 4);

	const priceLabel =
		typeof product.sellPrice === "number"
			? currencyFormatter.format(product.sellPrice)
			: null;

	const availability = resolveAvailability(product.quantity ?? null);

	return (
		<SiteShell>
			<article className='space-y-16'>
				<section className='glass-panel grid gap-10 rounded-4xl border border-white/60 bg-white/75 p-6 text-gray-900 shadow-soft lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10'>
					<div className='space-y-6'>
						<ProductGallery product={product} />
						<div className='grid gap-4 sm:grid-cols-3'>
							{PRODUCT_RITUALS.map((ritual) => (
								<div
									key={ritual.title}
									className='rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-gray-600 shadow-inner'>
									<p className='text-lg'>{ritual.icon}</p>
									<p className='mt-2 font-semibold text-gray-900'>
										{ritual.title}
									</p>
									<p className='mt-1 text-xs leading-relaxed text-gray-500'>
										{ritual.description}
									</p>
								</div>
							))}
						</div>
					</div>

					<div className='space-y-8 text-gray-800'>
						<div className='space-y-4'>
							<span className='pill inline-flex bg-white/80 text-[0.6rem] tracking-[0.35em] text-gray-500'>
								{product.brand ?? "Colección exclusiva"}
							</span>
							<h1 className='brand-heading text-3xl font-semibold text-gray-900 sm:text-4xl'>
								{product.name}
							</h1>
							{product.description ? (
								<p className='text-base leading-relaxed text-gray-600'>
									{product.description}
								</p>
							) : (
								<p className='text-base text-gray-600'>
									Creamos experiencias sensoriales y asesoría personalizada para
									cada ritual de cuidado.
								</p>
							)}
							<div className='flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500'>
								{product.category ? (
									<span className='rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[0.65rem] text-gray-600'>
										{product.category}
									</span>
								) : null}
								<span className='rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[0.65rem] text-gray-600'>
									Entrega boutique 24h
								</span>
							</div>
						</div>

						<div className='rounded-3xl border border-white/60 bg-white/85 p-6 shadow-soft'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								Precio boutique
							</p>
							<p className='brand-heading mt-3 text-4xl font-semibold text-gray-900'>
								{priceLabel ?? "Contáctanos"}
							</p>
							<p className='mt-2 text-sm text-gray-500'>
								Incluye asesoría personalizada y recordatorios para tu
								reposición.
							</p>
							<div className='mt-4 flex flex-wrap gap-2'>
								<span
									className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
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
								<span className='inline-flex items-center rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500'>
									Pago seguro
								</span>
							</div>
							<div className='mt-6 flex flex-wrap gap-3'>
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
									className='inline-flex items-center justify-center rounded-full border border-blush-200 px-4 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-50'>
									Ver carrito
								</Link>
								<Link
									href='/contact'
									className='inline-flex items-center justify-center rounded-full border border-transparent px-4 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-50'>
									Asesoría personalizada
								</Link>
							</div>
						</div>

						<div className='space-y-4'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								Notas de la casa
							</p>
							<div className='grid gap-4 sm:grid-cols-2'>
								{PRODUCT_PERKS.map((perk) => (
									<div
										key={perk.title}
										className='rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-gray-600 shadow-inner'>
										<p className='text-lg'>{perk.icon}</p>
										<p className='mt-2 font-semibold text-gray-900'>
											{perk.title}
										</p>
										<p className='mt-1 text-xs leading-relaxed text-gray-500'>
											{perk.description}
										</p>
									</div>
								))}
							</div>
						</div>

						{product.attributes?.length ? (
							<div className='space-y-3 text-sm text-gray-600'>
								<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Detalles del producto
								</p>
								<dl className='grid gap-4 sm:grid-cols-2'>
									{product.attributes.map((attribute) => (
										<div
											key={`${attribute.label}-${attribute.value}`}
											className='rounded-2xl border border-white/60 bg-white/80 p-4'>
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

const PRODUCT_RITUALS = [
	{
		title: "Ritual AM",
		description: "Texturas frescas y protección ligera para comenzar el día.",
		icon: "🌤️",
	},
	{
		title: "Ritual PM",
		description:
			"Regeneración profunda para recuperar la luminosidad nocturna.",
		icon: "🌙",
	},
	{
		title: "Toque Experto",
		description:
			"Asesoría personalizada para combinarlo con tus otros esenciales.",
		icon: "💎",
	},
] as const;

const PRODUCT_PERKS = [
	{
		title: "Selección curada",
		description: "Solo piezas con ingredientes nobles y perfumería boutique.",
		icon: "🪄",
	},
	{
		title: "Recordatorios suaves",
		description:
			"Te avisamos cuando sea momento de reponer tu producto estrella.",
		icon: "⏰",
	},
	{
		title: "Envío boutique",
		description: "Empaque delicado y entregas cuidadas en Managua en 24h.",
		icon: "📦",
	},
	{
		title: "Atención 1:1",
		description:
			"Conversamos contigo por WhatsApp para resolver cualquier duda.",
		icon: "🤍",
	},
] as const;
