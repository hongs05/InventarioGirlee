import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const dateTimeFormatter = new Intl.DateTimeFormat("es-NI", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

export default async function DashboardPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const [
		productStats,
		comboStats,
		categoryStats,
		recentProducts,
		recentCombos,
	] = await Promise.all([
		supabase.from("products").select("id", { count: "exact", head: true }),
		supabase.from("combos").select("id", { count: "exact", head: true }),
		supabase.from("categories").select("id", { count: "exact", head: true }),
		supabase
			.from("products")
			.select("id, name, created_at")
			.order("created_at", { ascending: false })
			.limit(5),
		supabase
			.from("combos")
			.select("id, name, created_at")
			.order("created_at", { ascending: false })
			.limit(5),
	]);

	const productCount = productStats.count ?? 0;
	const comboCount = comboStats.count ?? 0;
	const categoryCount = categoryStats.count ?? 0;

	const recentProductItems = (recentProducts.data ?? []) as Array<{
		id: string;
		name: string;
		created_at: string;
	}>;

	const recentComboItems = (recentCombos.data ?? []) as Array<{
		id: string;
		name: string;
		created_at: string;
	}>;

	return (
		<DashboardShell
			user={user}
			currentPath='/dashboard'
			title='Panel general'
			description='Monitoriza tu inventario, combos y categorías de un vistazo.'>
			<section className='grid gap-6 lg:grid-cols-3'>
				<StatCard
					title='Productos totales'
					value={productCount}
					helperText='Incluye activos, borradores y archivados'
				/>
				<StatCard
					title='Combos creados'
					value={comboCount}
					helperText='Paquetes disponibles en tu catálogo'
				/>
				<StatCard
					title='Categorías'
					value={categoryCount}
					helperText='Organiza tus productos por segmentos'
				/>
			</section>

			<section className='grid gap-6 lg:grid-cols-2'>
				<ActivityList
					title='Últimos productos'
					emptyLabel='Aún no registras productos.'
					items={recentProductItems.map((product) => ({
						href: `/inventory/${product.id}`,
						label: product.name,
						subLabel: dateTimeFormatter.format(new Date(product.created_at)),
					}))}
				/>
				<ActivityList
					title='Últimos combos'
					emptyLabel='Aún no registras combos.'
					items={recentComboItems.map((combo) => ({
						href: `/combos/${combo.id}`,
						label: combo.name,
						subLabel: dateTimeFormatter.format(new Date(combo.created_at)),
					}))}
				/>
			</section>
		</DashboardShell>
	);
}

function StatCard({
	title,
	value,
	helperText,
}: {
	title: string;
	value: number;
	helperText?: string;
}) {
	return (
		<div className='rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
			<p className='text-sm font-medium text-blush-500'>{title}</p>
			<p className='mt-2 text-3xl font-semibold text-gray-900'>{value}</p>
			{helperText ? (
				<p className='mt-2 text-xs text-gray-500'>{helperText}</p>
			) : null}
		</div>
	);
}

function ActivityList({
	title,
	emptyLabel,
	items,
}: {
	title: string;
	emptyLabel: string;
	items: Array<{ href: string; label: string; subLabel: string }>;
}) {
	return (
		<div className='rounded-xl border border-blush-200 bg-white shadow-sm'>
			<div className='border-b border-blush-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
			</div>
			{items.length ? (
				<ul className='divide-y divide-gray-200'>
					{items.map((item) => (
						<li key={item.href} className='px-6 py-4'>
							<Link
								href={item.href}
								className='flex flex-col text-sm transition hover:text-blush-600'>
								<span className='font-medium text-gray-900'>{item.label}</span>
								<span className='text-xs text-gray-500'>{item.subLabel}</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className='px-6 py-8 text-sm text-gray-500'>{emptyLabel}</p>
			)}
		</div>
	);
}
