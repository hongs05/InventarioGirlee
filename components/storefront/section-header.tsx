import type { ReactNode } from "react";

type SectionHeaderProps = {
	title: string;
	subtitle?: string;
	action?: ReactNode;
	className?: string;
};

export function SectionHeader({
	title,
	subtitle,
	action,
	className,
}: SectionHeaderProps) {
	return (
		<div
			className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
				className ?? ""
			}`}>
			<div className='space-y-2'>
				<p className='pill inline-flex bg-white/70 text-[0.6rem] tracking-[0.4em] text-gray-500'>
					Nueva selección
				</p>
				<h2 className='brand-heading text-3xl font-semibold text-gray-900 sm:text-4xl'>
					{title}
				</h2>
				<span className='block h-1.5 w-16 rounded-full bg-linear-to-r from-blush-500 via-blush-400 to-[#c79cfa]' />
				{subtitle ? (
					<p className='max-w-2xl text-sm text-gray-600 sm:text-base'>
						{subtitle}
					</p>
				) : null}
			</div>
			{action ? <div className='shrink-0'>{action}</div> : null}
		</div>
	);
}
