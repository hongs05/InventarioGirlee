import Link from "next/link";

import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";

const MILESTONES = [
	{
		year: "2019",
		title: "Primer pop-up",
		description:
			"Girlee nació como un pequeño evento entre amigas para compartir skincare. La energía nos impulsó a crear una experiencia recurrente.",
	},
	{
		year: "2021",
		title: "Inventario inteligente",
		description:
			"Diseñamos nuestra plataforma interna para gestionar inventario, reservas y combos personalizados con datos en tiempo real.",
	},
	{
		year: "2024",
		title: "Girlee Experience",
		description:
			"Abrimos nuestro espacio boutique con asesorías privadas, talleres y un inventario curado para Centroamérica.",
	},
];

const VALUES = [
	{
		title: "Cuidado cercano",
		description:
			"Creemos en conversaciones honestas, recomendaciones transparentes y seguimiento constante para cada piel y estilo de vida.",
	},
	{
		title: "Curaduría consciente",
		description:
			"Seleccionamos fórmulas con resultados visibles, ingredientes responsables y marcas que compartan nuestros valores.",
	},
	{
		title: "Experiencias memorables",
		description:
			"Cada entrega, evento o asesoría está llena de detalles para que te sientas celebrada y acompañada.",
	},
];

export default function AboutPage() {
	return (
		<SiteShell>
			<section className='space-y-12'>
				<SectionHeader
					title='Nuestra historia'
					subtitle='Girlee es una comunidad de cuidado y experiencias creada por mujeres que aman compartir rituales de belleza con intención.'
				/>

				<div className='grid gap-8 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]'>
					<div className='space-y-4 text-gray-700'>
						<p>
							Lo que inició como un pop-up entre amigas se transformó en un
							inventario inteligente con asesorías personalizadas y un equipo
							que vive por crear momentos memorables. Sabemos que cada piel y
							cada ocasión es única, por eso diseñamos rutas a medida.
						</p>
						<p>
							Hoy Girlee combina tecnología y calidez humana para ofrecer
							productos con rotación constante, combos listos para regalar y
							eventos que celebran la identidad de cada mujer centroamericana.
						</p>
						<p>
							Trabajamos con marcas que respetan la piel y el planeta, mientras
							acompañamos a nuestra comunidad con recordatorios, seguimiento y
							sorpresas. Porque el cuidado personal también es un acto
							colectivo.
						</p>
					</div>
					<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/90 p-6 shadow-inner'>
						<h3 className='text-lg font-semibold text-gray-900'>
							Lo que hacemos diferente
						</h3>
						<ul className='space-y-3 text-sm text-gray-600'>
							<li>
								✔️ Inventario con datos en vivo para garantizar frescura y
								disponibilidad.
							</li>
							<li>
								✔️ Rutinas personalizadas y combos temáticos listos para
								sorprender.
							</li>
							<li>
								✔️ Talleres, eventos privados y regalos corporativos curados a
								medida.
							</li>
						</ul>
						<Link
							href='/contact'
							className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blush-400'>
							Conversemos
						</Link>
					</div>
				</div>

				<section className='space-y-6'>
					<h2 className='text-2xl font-semibold text-gray-900'>
						Nuestra línea de tiempo
					</h2>
					<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm lg:grid-cols-3'>
						{MILESTONES.map((milestone) => (
							<div key={milestone.year} className='space-y-3'>
								<p className='text-xs font-semibold uppercase tracking-[0.4em] text-blush-500'>
									{milestone.year}
								</p>
								<h3 className='text-lg font-semibold text-gray-900'>
									{milestone.title}
								</h3>
								<p className='text-sm text-gray-600'>{milestone.description}</p>
							</div>
						))}
					</div>
				</section>

				<section className='space-y-6'>
					<h2 className='text-2xl font-semibold text-gray-900'>
						Nuestros valores
					</h2>
					<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm md:grid-cols-3'>
						{VALUES.map((value) => (
							<div key={value.title} className='space-y-3'>
								<h3 className='text-lg font-semibold text-gray-900'>
									{value.title}
								</h3>
								<p className='text-sm text-gray-600'>{value.description}</p>
							</div>
						))}
					</div>
				</section>

				<section className='space-y-4 rounded-3xl border border-blush-100 bg-linear-to-r from-blush-500 via-blush-400 to-blush-500 p-8 text-white shadow-lg'>
					<h2 className='text-2xl font-semibold text-white sm:text-3xl'>
						Creamos experiencias con intención
					</h2>
					<p className='max-w-2xl text-sm text-white/85 sm:text-base'>
						Co-creamos eventos, lanzamientos y rituales corporativos que
						celebran la esencia femenina. Diseñamos cada detalle para que tus
						invitadas se lleven momentos inolvidables.
					</p>
					<div className='flex flex-wrap gap-3'>
						<Link
							href='/contact'
							className='inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-white/90'>
							Planificar un evento
						</Link>
						<Link
							href='https://www.instagram.com'
							target='_blank'
							rel='noreferrer'
							className='inline-flex items-center rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10'>
							Síguenos para inspiración
						</Link>
					</div>
				</section>
			</section>
		</SiteShell>
	);
}
