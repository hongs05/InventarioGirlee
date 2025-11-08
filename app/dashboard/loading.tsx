import { DashboardShellSkeleton } from "@/components/dashboard-shell";

export default function DashboardLoading() {
	return (
		<DashboardShellSkeleton
			title='Panel general'
			description='Monitoriza tu inventario, combos y categorías de un vistazo.'>
			<section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={`stat-${index}`}
						className='rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
						<div className='h-4 w-28 animate-pulse rounded bg-blush-100' />
						<div className='mt-3 h-10 w-20 animate-pulse rounded bg-blush-100' />
						<div className='mt-4 h-3 w-32 animate-pulse rounded bg-blush-50' />
					</div>
				))}
			</section>

			<section className='grid gap-6 xl:grid-cols-[2fr,1fr]'>
				<div className='rounded-xl border border-blush-200 bg-white shadow-sm'>
					<div className='border-b border-blush-200 px-6 py-4'>
						<div className='h-5 w-52 animate-pulse rounded bg-blush-100' />
						<div className='mt-2 h-3 w-64 animate-pulse rounded bg-blush-50' />
					</div>
					<div className='space-y-6 px-6 py-5'>
						<div className='grid gap-4 rounded-lg border border-blush-100 bg-blush-50/60 p-4 sm:grid-cols-3'>
							{Array.from({ length: 3 }).map((_, idx) => (
								<div key={`summary-${idx}`} className='space-y-2'>
									<div className='h-3 w-24 animate-pulse rounded bg-blush-100' />
									<div className='h-5 w-20 animate-pulse rounded bg-blush-100' />
									<div className='h-3 w-28 animate-pulse rounded bg-blush-50' />
								</div>
							))}
						</div>
						<ul className='space-y-4'>
							{Array.from({ length: 7 }).map((_, idx) => (
								<li key={`trend-${idx}`} className='space-y-2'>
									<div className='flex items-center justify-between'>
										<div className='h-3 w-24 animate-pulse rounded bg-blush-100' />
										<div className='h-3 w-20 animate-pulse rounded bg-blush-100' />
									</div>
									<div className='h-2 w-full animate-pulse rounded-full bg-blush-100' />
									<div className='h-2 w-32 animate-pulse rounded bg-blush-50' />
								</li>
							))}
						</ul>
					</div>
				</div>
				<div className='flex flex-col rounded-xl border border-blush-200 bg-white p-6 shadow-sm'>
					<div className='h-5 w-40 animate-pulse rounded bg-blush-100' />
					<div className='mt-2 h-3 w-48 animate-pulse rounded bg-blush-50' />
					<ul className='mt-6 space-y-4'>
						{Array.from({ length: 4 }).map((_, idx) => (
							<li
								key={`inventory-${idx}`}
								className='flex items-center justify-between'>
								<div className='h-3 w-32 animate-pulse rounded bg-blush-100' />
								<div className='h-3 w-16 animate-pulse rounded bg-blush-100' />
							</li>
						))}
					</ul>
					<div className='mt-6 h-16 animate-pulse rounded-md border border-dashed border-blush-200 bg-blush-50' />
				</div>
			</section>

			<section className='grid gap-6 lg:grid-cols-2 xl:grid-cols-3'>
				{[
					{
						key: "products",
						border: "border-blush-200",
						badge: "bg-blush-100",
					},
					{ key: "combos", border: "border-blush-200", badge: "bg-blush-100" },
					{
						key: "low-stock",
						border: "border-amber-200",
						badge: "bg-amber-100",
					},
				].map((card) => (
					<div
						key={card.key}
						className={`rounded-xl border ${card.border} bg-white shadow-sm`}>
						<div className={`border-b px-6 py-4 ${card.border}`}>
							<div className='h-5 w-44 animate-pulse rounded bg-blush-100' />
							<div className='mt-2 h-3 w-32 animate-pulse rounded bg-blush-50' />
						</div>
						<ul className='divide-y divide-gray-200'>
							{Array.from({ length: 5 }).map((_, idx) => (
								<li key={`${card.key}-${idx}`} className='px-6 py-4'>
									<div className='flex items-center justify-between'>
										<div className='h-4 w-40 animate-pulse rounded bg-blush-100' />
										<div
											className={`h-4 w-16 animate-pulse rounded ${card.badge}`}
										/>
									</div>
									<div className='mt-2 h-3 w-32 animate-pulse rounded bg-blush-50' />
								</li>
							))}
						</ul>
					</div>
				))}
			</section>
		</DashboardShellSkeleton>
	);
}
