import Link from "next/link";

import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";

const CARE_GUIDES: Array<{
	title: string;
	description: string;
	tips: string[];
	icon: string;
}> = [
	{
		title: "Conservación de productos",
		description:
			"Nuestros productos llegan listos para disfrutarse. Sigue estas recomendaciones para que mantengan su potencia y textura ideales.",
		tips: [
			"Guárdalos en un lugar fresco, lejos de la luz directa del sol.",
			"Evita llevarlos a la ducha; el vapor puede alterar fórmulas sensibles.",
			"Revisa fechas de expiración y anótalas en tu agenda o app favorita.",
		],
		icon: "🛁",
	},
	{
		title: "Rutinas personalizadas",
		description:
			"Cada entrega incluye una guía de uso creada por nuestras expertas. Ajusta la rutina con estas buenas prácticas.",
		tips: [
			"Documenta cambios en tu piel o cabello para futuras recomendaciones.",
			"Introduce nuevos activos de uno en uno para observar resultados.",
			"Escríbenos si notas sensibilidad; adaptamos la rutina sin costo.",
		],
		icon: "📝",
	},
	{
		title: "Experiencias y regalos",
		description:
			"Para eventos, workshops y cajas regalo cuidamos cada detalle. Así puedes prolongar la magia después de la entrega.",
		tips: [
			"Mantén los arreglos en superficies planas y frescas.",
			"Comparte con tu anfitriona la tarjeta de cuidados incluida.",
			"Si viajas, empaca en bolsas con cierre hermético para evitar derrames.",
		],
		icon: "🎁",
	},
];

const SERVICE_SUPPORT: Array<{
	title: string;
	details: string;
	actionLabel: string;
	actionHref: string;
}> = [
	{
		title: "Atención postventa",
		details:
			"Respondemos en menos de 24h con ajustes, reposiciones o una nueva asesoría. Nuestra meta es que disfrutes cada producto al máximo.",
		actionLabel: "Escríbenos por WhatsApp",
		actionHref: "https://wa.me/50588888888",
	},
	{
		title: "Garantía Girlee",
		details:
			"Si un producto llega dañado o no corresponde con tu pedido, lo sustituimos y coordinamos la recogida sin costo adicional.",
		actionLabel: "Reportar incidencia",
		actionHref:
			"mailto:hola@inventariogirlee.com?subject=Garant%C3%ADa%20Girlee",
	},
	{
		title: "Equipo interno",
		details:
			"El portal de inventario y dashboard es exclusivo para el staff. Si eres parte del equipo y necesitas acceso, contacta a operaciones.",
		actionLabel: "Contactar operaciones",
		actionHref: "mailto:ops@inventariogirlee.com",
	},
];

const FAQS: Array<{ question: string; answer: string }> = [
	{
		question: "¿Qué hago si un producto provoca sensibilidad?",
		answer:
			"Detén su uso inmediato, cuéntanos los detalles por WhatsApp o correo y te guiaremos con una alternativa más amable para tu piel.",
	},
	{
		question: "¿Puedo reagendar una experiencia o entrega?",
		answer:
			"Sí. Con 48h de anticipación podemos reprogramar sin cargos. Para cambios urgentes haremos lo posible por adaptarnos.",
	},
	{
		question: "¿Dónde consulto mis puntos de fidelidad?",
		answer:
			'Inicia sesión en "Mi cuenta" para ver tus recompensas. Si no recuerdas tu acceso, escríbenos para restaurarlo.',
	},
];

export default function StoreCarePage() {
	return (
		<SiteShell>
			<section className='space-y-12'>
				<SectionHeader
					title='Store Care & Experiencia Girlee'
					subtitle='Guía rápida para cuidar tus productos, resolver dudas postventa y entender cómo operamos entre nuestro frente boutique y el backoffice.'
					action={
						<Link
							href='/contact'
							className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
							Solicitar seguimiento
						</Link>
					}
				/>

				<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm md:grid-cols-3'>
					{CARE_GUIDES.map((guide) => (
						<article
							key={guide.title}
							className='space-y-4 rounded-3xl border border-blush-100 bg-white/70 p-6 shadow-sm'>
							<div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-blush-100 text-lg'>
								{guide.icon}
							</div>
							<h3 className='text-lg font-semibold text-gray-900'>
								{guide.title}
							</h3>
							<p className='text-sm text-gray-600'>{guide.description}</p>
							<ul className='space-y-2 text-sm text-gray-600'>
								{guide.tips.map((tip) => (
									<li key={tip} className='flex gap-2'>
										<span className='mt-1 h-1.5 w-1.5 rounded-full bg-blush-400' />
										<span>{tip}</span>
									</li>
								))}
							</ul>
						</article>
					))}
				</div>

				<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm md:grid-cols-3'>
					{SERVICE_SUPPORT.map((service) => (
						<div
							key={service.title}
							className='space-y-4 rounded-3xl border border-blush-100 bg-white/70 p-6 shadow-sm'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								Soporte
							</p>
							<h3 className='text-lg font-semibold text-gray-900'>
								{service.title}
							</h3>
							<p className='text-sm text-gray-600'>{service.details}</p>
							<Link
								href={service.actionHref}
								target={
									service.actionHref.startsWith("http") ? "_blank" : undefined
								}
								rel={
									service.actionHref.startsWith("http")
										? "noreferrer"
										: undefined
								}
								className='inline-flex items-center text-sm font-semibold text-blush-600 transition hover:text-blush-500'>
								{service.actionLabel}
							</Link>
						</div>
					))}
				</div>

				<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm'>
					<h2 className='text-xl font-semibold text-gray-900'>
						Preguntas frecuentes
					</h2>
					<dl className='space-y-4 text-sm text-gray-600'>
						{FAQS.map((faq) => (
							<div
								key={faq.question}
								className='rounded-2xl border border-blush-100 bg-white/70 p-5 shadow-sm'>
								<dt className='text-base font-semibold text-gray-900'>
									{faq.question}
								</dt>
								<dd className='mt-2 leading-relaxed'>{faq.answer}</dd>
							</div>
						))}
					</dl>
				</div>

				<div className='rounded-3xl border border-dashed border-blush-200 bg-white/60 p-8 text-sm text-gray-600 shadow-sm'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
						Front office vs backoffice
					</p>
					<p className='mt-2 text-base font-semibold text-gray-900'>
						Cada universo con su propósito
					</p>
					<p className='mt-3'>
						Nuestro frente boutique es 100% abierto a la comunidad Girlee. El
						dashboard interno, inventario y herramientas operativas se gestionan
						por el staff y colaboradores autorizados.
					</p>
					<p className='mt-3'>
						¿Eres parte del equipo? Solicita tu acceso o restablece credenciales
						escribiendo a operaciones. ¿Eres clienta? Explora libremente
						nuestros servicios o agenda una asesoría cuando quieras.
					</p>
				</div>
			</section>
		</SiteShell>
	);
}
