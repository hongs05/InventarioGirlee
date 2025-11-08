import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Panel" },
	{ href: "/finance", label: "Finanzas" },
	{ href: "/inventory", label: "Inventario" },
	{ href: "/categories", label: "Categorías" },
	{ href: "/combos", label: "Combos" },
	{ href: "/orders", label: "Órdenes" },
	{ href: "/pos", label: "POS" },
];

type DashboardShellProps = {
	user: User;
	currentPath: string;
	title?: string;
	description?: string;
	action?: ReactNode;
	children: ReactNode;
};

function isActive(pathname: string, target: string) {
	return pathname === target || pathname.startsWith(`${target}/`);
}

export function DashboardShellSkeleton({
	title,
	description,
	children,
}: {
	title?: string;
	description?: string;
	children?: ReactNode;
}) {
	return (
		<div className='flex min-h-screen bg-blush-50 text-gray-900'>
			<aside className='hidden w-64 flex-col border-r border-blush-100 bg-white lg:flex'>
				<div className='flex h-16 items-center border-b border-blush-100 px-6 text-lg font-semibold text-blush-600'>
					Inventario Girlee
				</div>
				<nav className='flex-1 space-y-1 px-3 py-6'>
					{NAV_ITEMS.map((item) => (
						<div
							key={item.href}
							className='flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-500'>
							<span>{item.label}</span>
							<span className='h-2 w-2 rounded-full bg-blush-100' />
						</div>
					))}
				</nav>
				<footer className='px-6 py-4 text-xs text-gray-400'>
					&copy; {new Date().getFullYear()} Inventario Girlee
				</footer>
			</aside>
			<div className='flex min-w-0 flex-1 flex-col'>
				<header className='border-b border-blush-100 bg-white px-4 py-4 sm:px-6 lg:px-8'>
					<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div>
							<div className='h-3 w-32 animate-pulse rounded bg-blush-100' />
							<div className='mt-2 h-4 w-48 animate-pulse rounded bg-blush-100' />
						</div>
						<nav className='flex items-center gap-2 text-sm text-gray-600 lg:hidden'>
							{NAV_ITEMS.map((item) => (
								<span
									key={item.href}
									className='inline-flex rounded-md px-3 py-1 text-gray-400'>
									{item.label}
								</span>
							))}
						</nav>
						<div className='inline-flex h-9 w-32 animate-pulse rounded-md bg-blush-100' />
					</div>
				</header>
				<main className='flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8'>
					{(title || description) && (
						<div className='mb-6 space-y-2'>
							{title ? (
								<div className='h-8 w-56 animate-pulse rounded bg-blush-100' />
							) : null}
							{description ? (
								<div className='h-4 w-72 animate-pulse rounded bg-blush-100' />
							) : null}
						</div>
					)}
					<div className='space-y-6'>{children}</div>
				</main>
			</div>
		</div>
	);
}
export default function DashboardShell({
	user,
	currentPath,
	title,
	description,
	action,
	children,
}: DashboardShellProps) {
	async function signOut() {
		"use server";

		const supabase = await createSupabaseServerClient();
		await supabase.auth.signOut();
		redirect("/login");
	}

	return (
		<div className='flex min-h-screen bg-blush-50 text-gray-900'>
			<aside className='hidden w-64 flex-col border-r border-blush-100 bg-white lg:flex'>
				<div className='flex h-16 items-center border-b border-blush-100 px-6 text-lg font-semibold text-blush-600'>
					Inventario Girlee
				</div>
				<nav className='flex-1 space-y-1 px-3 py-6'>
					{NAV_ITEMS.map((item) => {
						const active = isActive(currentPath, item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
									active
										? "bg-blush-100 text-blush-600"
										: "text-gray-600 hover:bg-blush-50 hover:text-blush-600"
								}`}>
								{item.label}
							</Link>
						);
					})}
				</nav>
				<footer className='px-6 py-4 text-xs text-gray-400'>
					&copy; {new Date().getFullYear()} Inventario Girlee
				</footer>
			</aside>
			<div className='flex min-w-0 flex-1 flex-col'>
				<header className='border-b border-blush-100 bg-white px-4 py-4 sm:px-6 lg:px-8'>
					<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div>
							<p className='text-xs font-medium uppercase tracking-wide text-blush-500'>
								Sesión iniciada como
							</p>
							<p className='text-sm font-semibold text-gray-900'>
								{user.email}
							</p>
						</div>
						<nav className='flex items-center gap-2 text-sm text-gray-600 lg:hidden'>
							{NAV_ITEMS.map((item) => {
								const active = isActive(currentPath, item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`rounded-md px-3 py-1 font-medium transition-colors ${
											active
												? "bg-blush-100 text-blush-600"
												: "hover:bg-blush-50 hover:text-blush-600"
										}`}>
										{item.label}
									</Link>
								);
							})}
						</nav>
						<form action={signOut} className='lg:ml-auto'>
							<button
								type='submit'
								className='inline-flex items-center justify-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400'>
								Cerrar sesión
							</button>
						</form>
					</div>
				</header>
				<main className='flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8'>
					{(title || description || action) && (
						<div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
							<div>
								{title ? (
									<h1 className='text-3xl font-semibold text-gray-900'>
										{title}
									</h1>
								) : null}
								{description ? (
									<p className='mt-1 text-sm text-gray-500'>{description}</p>
								) : null}
							</div>
							{action ? <div className='flex shrink-0'>{action}</div> : null}
						</div>
					)}
					<div className='space-y-6'>{children}</div>
				</main>
			</div>
		</div>
	);
}
