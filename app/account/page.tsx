import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function signOut() {
	"use server";

	const supabase = await createSupabaseServerClient();
	await supabase.auth.signOut();
	redirect("/");
}

export default async function AccountPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<SiteShell>
			<section className='space-y-10'>
				<SectionHeader
					title='Mi espacio Girlee'
					subtitle='Gestiona tu información, guarda tus favoritos y recibe recomendaciones personalizadas.'
				/>

				{user ? (
					<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'>
						<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm'>
							<h2 className='text-xl font-semibold text-gray-900'>
								Hola, {user.email}
							</h2>
							<p className='text-sm text-gray-600'>
								Este es tu panel personal. Guarda productos, agenda asesorías y
								recibe sorpresas exclusivas.
							</p>

							<div className='rounded-2xl border border-dashed border-blush-200 bg-blush-50/70 p-5 text-sm text-gray-600'>
								<p className='font-semibold text-gray-900'>
									Favoritos y listas
								</p>
								<p className='mt-2'>
									Pronto podrás crear colecciones, dejar notas y compartirlas
									con tus personas favoritas.
								</p>
							</div>

							<div className='flex flex-wrap gap-3'>
								<Link
									href='/dashboard'
									className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blush-400'>
									Ir al panel administrativo
								</Link>
								<form action={signOut}>
									<button
										type='submit'
										className='inline-flex items-center rounded-full border border-blush-300 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-blush-100'>
										Cerrar sesión
									</button>
								</form>
							</div>
						</div>

						<div className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm'>
							<h3 className='text-lg font-semibold text-gray-900'>
								Próximos pasos
							</h3>
							<ul className='space-y-4 text-sm text-gray-600'>
								<li className='rounded-2xl border border-blush-100 bg-white/60 p-4'>
									<p className='font-semibold text-gray-900'>
										Agenda tu asesoría
									</p>
									<p className='mt-1'>
										Cuéntanos qué quieres lograr y diseñamos un plan con
										productos Girlee.
									</p>
									<Link
										href='/contact'
										className='mt-2 inline-flex items-center text-sm font-semibold text-blush-600 hover:text-blush-500'>
										Escríbenos
									</Link>
								</li>
								<li className='rounded-2xl border border-blush-100 bg-white/60 p-4'>
									<p className='font-semibold text-gray-900'>
										Historial de pedidos
									</p>
									<p className='mt-1'>
										Estamos preparando un nuevo espacio para seguir tus pedidos
										y reposiciones.
									</p>
								</li>
							</ul>
						</div>
					</div>
				) : (
					<div className='grid gap-8 rounded-3xl border border-blush-100 bg-white/80 p-8 text-center shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:text-left'>
						<div className='space-y-4'>
							<h2 className='text-2xl font-semibold text-gray-900'>
								Crea tu cuenta Girlee
							</h2>
							<p className='text-sm text-gray-600'>
								Guarda tus favoritos, recibe recordatorios de reposición y
								acceso a ofertas privadas.
							</p>
							<div className='flex flex-wrap justify-center gap-3 lg:justify-start'>
								<Link
									href='/signup'
									className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blush-400'>
									Crear cuenta gratuita
								</Link>
								<Link
									href='/login'
									className='inline-flex items-center rounded-full border border-blush-300 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-blush-100'>
									Ingresar
								</Link>
							</div>
						</div>
						<div className='space-y-3 rounded-2xl border border-dashed border-blush-200 bg-blush-50/70 p-6 text-sm text-gray-600'>
							<p className='font-semibold text-gray-900'>
								Beneficios exclusivos
							</p>
							<ul className='space-y-2'>
								<li>✔️ Acceso prioritario a lanzamientos</li>
								<li>✔️ Recordatorios de reposición personalizados</li>
								<li>✔️ Invitaciones a eventos privados y talleres</li>
							</ul>
						</div>
					</div>
				)}
			</section>
		</SiteShell>
	);
}
