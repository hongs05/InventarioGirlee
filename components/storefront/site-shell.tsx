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
		<div className='flex min-h-screen flex-col bg-linear-to-b from-white via-blush-50/80 to-white text-gray-900'>
			<header className='border-b border-blush-100 bg-white/80 backdrop-blur-sm'>
				<div className='mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8'>
					<Link
						href='/'
						className='flex items-center gap-2 text-lg font-semibold text-blush-600 transition hover:text-blush-500'>
						<span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush-100 text-base font-bold text-blush-600 shadow-inner'>
							IG
						</span>
						Inventario Girlee
					</Link>
					<nav className='hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex'>
						{NAV_LINKS.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className='group relative transition hover:text-blush-600'>
								<span>{item.label}</span>
								<span className='absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 transform bg-blush-400 transition-all duration-200 ease-out group-hover:scale-x-100' />
							</Link>
						))}
					</nav>
					<div className='flex items-center gap-3'>
						<CartButton />
						<Link
							href='/login'
							className='hidden rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70 md:inline-flex'>
							Iniciar sesión
						</Link>
						<Link
							href='/signup'
							className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
							Crea tu cuenta
						</Link>
					</div>
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

			<footer className='border-t border-blush-100 bg-white/70'>
				<div className='mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8'>
					<div>
						<p className='text-base font-semibold text-gray-900'>
							Inventario Girlee
						</p>
						<p className='mt-1 max-w-md text-sm text-gray-500'>
							Cuidado, belleza y experiencias memorables diseñadas para resaltar
							lo mejor de ti.
						</p>
					</div>
					<div className='space-y-2 text-sm text-gray-500'>
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
						<div className='flex items-center gap-4 pt-1'>
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
