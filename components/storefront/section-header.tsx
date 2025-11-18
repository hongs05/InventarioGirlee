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
			className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${
				className ?? ""
			}`}>
			<div className='space-y-2'>
				<h2 className='text-2xl font-semibold text-gray-900 sm:text-3xl'>
					{title}
				</h2>
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
