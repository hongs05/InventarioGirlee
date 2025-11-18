import Link from "next/link";

import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";

const CONTACT_CHANNELS = [
	{
		label: "WhatsApp",
		value: "+505 8888 8888",
		link: "https://wa.me/50588888888",
		description: "Coordinamos entregas, eventos y asesorías personalizadas.",
	},
	{
		label: "Instagram DM",
		value: "@girlee.ni",
		link: "https://www.instagram.com",
		description: "Descubre lanzamientos, lives y experiencias exclusivas.",
	},
	{
		label: "Correo",
		value: "hola@inventariogirlee.com",
		link: "mailto:hola@inventariogirlee.com",
		description: "Recibe propuestas corporativas, cotizaciones y press kits.",
	},
];

export default function ContactPage() {
	return (
		<SiteShell>
			<section className='space-y-12'>
				<SectionHeader
					title='Hablemos de tu próxima experiencia Girlee'
					subtitle='Agendamos asesorías personalizadas, diseñamos eventos sensoriales y coordinamos entregas con cariño en toda Nicaragua.'
				/>

				<div className='grid gap-8 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
					<div className='space-y-6'>
						<h2 className='text-xl font-semibold text-gray-900'>
							Canales directos
						</h2>
						<ul className='space-y-4 text-sm text-gray-600'>
							{CONTACT_CHANNELS.map((channel) => (
								<li
									key={channel.label}
									className='rounded-2xl border border-blush-100 bg-white/70 p-5 shadow-sm'>
									<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
										{channel.label}
									</p>
									<p className='mt-1 text-lg font-semibold text-gray-900'>
										{channel.value}
									</p>
									<p className='mt-2 text-sm text-gray-600'>
										{channel.description}
									</p>
									<Link
										href={channel.link}
										target='_blank'
										rel='noreferrer'
										className='mt-3 inline-flex items-center text-sm font-semibold text-blush-600 hover:text-blush-500'>
										Abrir canal
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-inner'>
						<h2 className='text-xl font-semibold text-gray-900'>
							Agenda una sesión personalizada
						</h2>
						<p className='text-sm text-gray-600'>
							Cuéntanos qué te gustaría lograr y preparamos una propuesta con
							productos, combos y sorpresas pensadas para ti.
						</p>
						<form
							className='space-y-4'
							action='https://formspree.io/f/xdorzden'
							method='post'
							target='_blank'
							rel='noreferrer'>
							<div>
								<label className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Nombre
								</label>
								<input
									type='text'
									name='name'
									required
									className='mt-2 w-full rounded-full border border-blush-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
								/>
							</div>
							<div>
								<label className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Correo
								</label>
								<input
									type='email'
									name='email'
									required
									className='mt-2 w-full rounded-full border border-blush-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
								/>
							</div>
							<div>
								<label className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
									Cuéntanos más
								</label>
								<textarea
									name='message'
									required
									rows={4}
									className='mt-2 w-full rounded-3xl border border-blush-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
									placeholder='¿Buscas una rutina personalizada, regalos corporativos o un evento especial?'
								/>
							</div>
							<button
								type='submit'
								className='inline-flex items-center rounded-full bg-blush-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blush-400'>
								Enviar mensaje
							</button>
						</form>
						<p className='text-xs text-gray-500'>
							Usamos Formspree para recibir tu mensaje de forma segura. Te
							responderemos en menos de 24h.
						</p>
					</div>
				</div>

				<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-8 shadow-sm md:grid-cols-3'>
					<div className='space-y-3 text-sm text-gray-600'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Ubicación boutique
						</p>
						<p className='text-base font-semibold text-gray-900'>
							Managua, Nicaragua
						</p>
						<p>
							Agenda tu visita para vivir la experiencia Girlee con asesoría
							privada.
						</p>
					</div>
					<div className='space-y-3 text-sm text-gray-600'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Horarios
						</p>
						<p className='text-base font-semibold text-gray-900'>
							Lunes a sábado
						</p>
						<p>10:00 a.m. – 6:00 p.m. / Domingos con cita previa.</p>
					</div>
					<div className='space-y-3 text-sm text-gray-600'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Colaboraciones
						</p>
						<p>
							Brands, prensa y creadores pueden escribir a{" "}
							<a
								className='font-semibold text-blush-600'
								href='mailto:pr@inventariogirlee.com'>
								pr@inventariogirlee.com
							</a>{" "}
							para recibir media kits y propuestas.
						</p>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
