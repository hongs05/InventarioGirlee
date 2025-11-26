import Link from "next/link";
import type { ReactNode } from "react";

import { CartButton } from "@/components/storefront/cart-button";

const NAV_LINKS: Array<{ href: string; label: string }> = [
	{ href: "/", label: "Inicio" },
	{ href: "/products", label: "Productos" },
	{ href: "/about", label: "Sobre nosotras" },
	{ href: "/store-care", label: "Cuidados" },
	{ href: "/cart", label: "Carrito" },
	{ href: "/contact", label: "Contacto" },
	{ href: "/account", label: "Mi cuenta" },
];

type SiteShellProps = {
	children: ReactNode;
	hero?: ReactNode;
	afterHero?: ReactNode;
	containerClassName?: string;
};

export function SiteShell({
	children,
	hero,
	afterHero,
	containerClassName,
}: SiteShellProps) {
	return (
		<div className='relative isolate flex min-h-screen flex-col bg-page text-gray-900'>
			<div className='pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-linear-to-b from-white/70 via-transparent to-transparent' />
			<header className='border-b border-white/40 bg-white/65 backdrop-blur-xl'>
				<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8'>
					<div className='flex items-center justify-between gap-4'>
						<Link
							href='/'
							className='flex items-center gap-3 text-lg font-semibold text-blush-600 transition hover:text-blush-500'>
							<span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-bold text-blush-600 shadow-soft'>
								IG
							</span>
							<div>
								<p className='brand-heading text-xl font-semibold leading-tight'>
									Inventario Girlee
								</p>
								<p className='text-xs uppercase tracking-[0.35em] text-gray-500'>
									Belleza Boutique
								</p>
							</div>
						</Link>
						<div className='flex items-center gap-3'>
							<CartButton />
							<Link
								href='/login'
								className='hidden rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blush-200 hover:bg-white/80 md:inline-flex'>
								Iniciar sesión
							</Link>
							<Link
								href='/signup'
								className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-blush-400'>
								Crea tu cuenta
							</Link>
						</div>
					</div>
					<nav className='flex flex-wrap items-center gap-2 text-sm font-medium text-gray-600'>
						{NAV_LINKS.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className='group inline-flex items-center rounded-full border border-transparent px-3 py-2 transition hover:border-blush-200 hover:bg-white/80 hover:text-blush-600'>
								<span>{item.label}</span>
								<span className='ml-2 h-1 w-6 origin-left scale-x-0 rounded-full bg-blush-400 transition duration-200 ease-out group-hover:scale-x-100' />
							</Link>
						))}
					</nav>
				</div>
			</header>

			{hero ? (
				<section className='border-b border-blush-100 bg-white/70'>
					{hero}
				</section>
			) : null}
			{afterHero ?? null}

			<main
				className={`mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8 ${
					containerClassName ?? ""
				}`}>
				{children}
			</main>

			<footer className='border-t border-white/40 bg-white/70'>
				<div className='mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 text-sm text-gray-600 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8'>
					<div>
						<p className='brand-heading text-2xl font-semibold text-gray-900'>
							Inventario Girlee
						</p>
						<p className='mt-2 max-w-md text-sm text-gray-500'>
							Cuidado, belleza y experiencias memorables diseñadas para resaltar
							lo mejor de ti.
						</p>
					</div>
					<div className='space-y-3 text-sm text-gray-500'>
						<p>
							Correo:{" "}
							<a
								href='mailto:hola@inventariogirlee.com'
								className='font-medium text-blush-600 hover:text-blush-500'>
								hola@inventariogirlee.com
							</a>
						</p>
						<p>
							Teléfono:{" "}
							<a
								href='tel:+50500000000'
								className='font-medium text-blush-600 hover:text-blush-500'>
								+505 0000 0000
							</a>
						</p>
						<div className='flex items-center gap-4 pt-2'>
							<Link
								href='https://www.facebook.com'
								target='_blank'
								rel='noreferrer'
								className='text-blush-600 transition hover:text-blush-500'>
								Facebook
							</Link>
							<Link
								href='https://www.instagram.com'
								target='_blank'
								rel='noreferrer'
								className='text-blush-600 transition hover:text-blush-500'>
								Instagram
							</Link>
						</div>
					</div>
					<p className='text-xs text-gray-400'>
						© {new Date().getFullYear()} Inventario Girlee. Todos los derechos
						reservados.
					</p>
				</div>
			</footer>
		</div>
	);
}
