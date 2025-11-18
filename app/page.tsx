import Link from "next/link";

import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";
import {
	listFeaturedCombos,
	listFeaturedProducts,
} from "@/lib/storefront/products";
export default async function HomePage() {
	const [featuredProducts, featuredCombos] = await Promise.all([
		listFeaturedProducts(6),
		listFeaturedCombos({ limit: 3 }),
	]);

	return (
		<SiteShell hero={<HeroSection />} afterHero={<HeroHighlights />}>
			<section className='space-y-6'>
				<SectionHeader
					title='Novedades para consentirte'
					subtitle='Productos seleccionados a mano con ingredientes y experiencias de lujo al alcance de tus manos.'
					action={
						<Link
							href='/products'
							className='inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70'>
							Ver catálogo completo
						</Link>
					}
				/>
				{featuredProducts.length ? (
					<div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
						{featuredProducts.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				) : (
					<div className='rounded-2xl border border-blush-100 bg-white/70 p-10 text-center text-sm text-gray-500'>
						Pronto añadiremos productos increíblemente especiales. Mientras
						tanto puedes contactarnos para asesoría personalizada.
					</div>
				)}
			</section>

			<section className='mt-16 space-y-6'>
				<SectionHeader
					title='Combos listos para regalar'
					subtitle='Curamos experiencias irresistibles con productos que se complementan para sorprender.'
				/>
				{featuredCombos.length ? (
					<div className='grid gap-6 md:grid-cols-3'>
						{featuredCombos.map((combo) => (
							<article
								key={combo.id}
								className='flex h-full flex-col rounded-3xl border border-blush-100 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg'>
								<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Colección exclusiva
								</p>
								<h3 className='mt-3 text-xl font-semibold text-gray-900'>
									{combo.name}
								</h3>
								<p className='mt-2 flex-1 text-sm text-gray-600'>
									{combo.description ??
										"Una selección deliciosa para crear momentos memorables."}
								</p>
								<Link
									href='/contact'
									className='mt-6 inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
									Solicitar ahora
								</Link>
							</article>
						))}
					</div>
				) : (
					<div className='rounded-2xl border border-dashed border-blush-200 bg-white/50 p-10 text-center text-sm text-gray-500'>
						Estamos preparando nuevos combos especiales. Escríbenos para diseñar
						uno a tu medida.
					</div>
				)}
			</section>

			<section className='mt-20 grid gap-8 rounded-3xl border border-blush-100 bg-white/80 p-10 shadow-sm md:grid-cols-3'>
				{SERVICE_PILLARS.map((pillar) => (
					<div key={pillar.title} className='space-y-3'>
						<div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-blush-100 text-lg font-semibold text-blush-600 shadow-inner'>
							{pillar.icon}
						</div>
						<h3 className='text-lg font-semibold text-gray-900'>
							{pillar.title}
						</h3>
						<p className='text-sm text-gray-600'>{pillar.description}</p>
					</div>
				))}
			</section>

			<section className='mt-20 overflow-hidden rounded-3xl border border-blush-100 bg-linear-to-r from-blush-500 via-blush-400 to-blush-500 text-white shadow-lg'>
				<div className='grid gap-8 p-10 md:grid-cols-[1.2fr_0.8fr] md:items-center'>
					<div className='space-y-4'>
						<h3 className='text-3xl font-semibold md:text-4xl'>
							Agenda una asesoría gratuita
						</h3>
						<p className='text-sm text-white/80 md:text-base'>
							Creamos rutinas personalizadas que combinan ingredientes y
							texturas según tus objetivos y estilo de vida.
						</p>
						<div className='flex flex-wrap gap-3'>
							<Link
								href='/contact'
								className='inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-white/90'>
								Habla con una experta
							</Link>
							<Link
								href='https://www.instagram.com'
								target='_blank'
								rel='noreferrer'
								className='inline-flex items-center rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10'>
								Síguenos en Instagram
							</Link>
						</div>
					</div>
					<div className='rounded-2xl bg-white/15 p-6 text-sm text-white/85 backdrop-blur'>
						<p className='text-lg font-semibold text-white'>
							Nuestras clientas cuentan
						</p>
						<p className='mt-3 italic'>
							“Desde que recibí mi rutina personalizada he notado cambios
							increíbles. La experiencia es cálida, humana y llena de detalles
							lindos.”
						</p>
						<p className='mt-4 text-xs uppercase tracking-[0.3em] text-white/70'>
							Andrea · Managua, Nicaragua
						</p>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}

function HeroSection() {
	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-20 lg:px-8'>
			<div className='space-y-6 lg:w-3/5'>
				<p className='text-sm font-semibold uppercase tracking-[0.4em] text-blush-500'>
					Bienvenida a Girlee
				</p>
				<h1 className='text-4xl font-semibold leading-tight text-gray-900 sm:text-5xl'>
					Belleza consciente, inventario inteligente y experiencias que abrazan
					tu esencia.
				</h1>
				<p className='max-w-2xl text-base text-gray-600 sm:text-lg'>
					Descubre productos cuidadosamente seleccionados, combos irresistibles
					y asesoría personalizada para crear momentos memorables.
				</p>
				<div className='flex flex-wrap gap-4'>
					<Link
						href='/products'
						className='inline-flex items-center rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
						Explorar productos
					</Link>
					<Link
						href='/about'
						className='inline-flex items-center rounded-full border border-blush-300 px-5 py-3 text-sm font-semibold text-blush-600 transition hover:bg-blush-100/70'>
						Nuestra historia
					</Link>
				</div>
			</div>
			<div className='relative flex-1 overflow-hidden rounded-3xl border border-blush-100 bg-white/70 p-6 shadow-lg'>
				<div className='absolute inset-0 -z-10 bg-linear-to-br from-blush-100 via-white to-blush-200 opacity-70' />
				<div className='grid gap-6 text-sm text-gray-700'>
					<div className='rounded-2xl border border-blush-100 bg-white/80 p-5 shadow-sm'>
						<p className='text-xs uppercase tracking-[0.3em] text-blush-500'>
							Programa de fidelidad
						</p>
						<p className='mt-2 text-base font-semibold text-gray-900'>
							Acumula puntos por cada compra y canjéalos por experiencias.
						</p>
					</div>
					<div className='rounded-2xl border border-blush-100 bg-white/80 p-5 shadow-sm'>
						<p className='text-xs uppercase tracking-[0.3em] text-blush-500'>
							Atención personalizada
						</p>
						<p className='mt-2 text-base font-semibold text-gray-900'>
							Rutinas diseñadas por expertas locales y entregas al día siguiente
							en Managua.
						</p>
					</div>
					<div className='rounded-2xl border border-blush-100 bg-white/80 p-5 shadow-sm'>
						<p className='text-xs uppercase tracking-[0.3em] text-blush-500'>
							Eventos privados
						</p>
						<p className='mt-2 text-base font-semibold text-gray-900'>
							Organizamos talleres, experiencias sensoriales y regalos
							corporativos a la medida.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

const HIGHLIGHTS = [
	{
		title: "+150 productos activos",
		description:
			"Inventario con rotación constante, enfocado en marcas queridas y novedades indie.",
	},
	{
		title: "Curación hecha en casa",
		description:
			"Seleccionamos cada artículo pensando en la piel, rutinas y deseos de nuestras clientas centroamericanas.",
	},
	{
		title: "Logística boutique",
		description:
			"Entregas en 24h en Managua y envíos regionales coordinados personalmente.",
	},
];

function HeroHighlights() {
	return (
		<div className='border-b border-blush-100 bg-white/60'>
			<div className='mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-10 lg:px-8'>
				{HIGHLIGHTS.map((highlight) => (
					<div
						key={highlight.title}
						className='flex-1 rounded-2xl border border-blush-100 bg-white/80 p-6 text-sm text-gray-600 shadow-sm'>
						<p className='text-base font-semibold text-gray-900'>
							{highlight.title}
						</p>
						<p className='mt-3 leading-relaxed'>{highlight.description}</p>
					</div>
				))}
			</div>
		</div>
	);
}

const SERVICE_PILLARS = [
	{
		title: "Rutinas personalizadas",
		description:
			"Te acompañamos paso a paso para combinar los ingredientes correctos y lograr tus objetivos de cuidado personal.",
		icon: "✨",
	},
	{
		title: "Curaduría consciente",
		description:
			"Trabajamos con marcas que priorizan la transparencia, resultados visibles y experiencias sensoriales únicas.",
		icon: "🌸",
	},
	{
		title: "Servicio cercano",
		description:
			"Coordinamos entregas personalizadas, recordatorios y detalles sorpresa para cada compra.",
		icon: "🤍",
	},
];
