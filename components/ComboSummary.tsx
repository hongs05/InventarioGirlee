"use client";

import { useMemo } from "react";

export type ComboSummaryItem = {
	id: string;
	name: string;
	qty: number;
	costPrice: number;
};

type ComboSummaryProps = {
	items: ComboSummaryItem[];
	packagingCost: number;
	suggestedPrice?: number;
	currency?: string;
};

export function ComboSummary({
	items,
	packagingCost,
	suggestedPrice,
	currency = "NIO",
}: ComboSummaryProps) {
	const formatter = useMemo(
		() => new Intl.NumberFormat("es-NI", { style: "currency", currency }),
		[currency],
	);

	const totals = useMemo(() => {
		const productsCost = items.reduce(
			(acc, item) => acc + item.costPrice * item.qty,
			0,
		);
		const totalCost = productsCost + packagingCost;
		const hasSuggestedPrice =
			typeof suggestedPrice === "number" && Number.isFinite(suggestedPrice);
		const profit = hasSuggestedPrice ? suggestedPrice - totalCost : null;

		return { productsCost, totalCost, profit, hasSuggestedPrice };
	}, [items, packagingCost, suggestedPrice]);

	return (
		<div className='space-y-4 rounded-lg border border-blush-200 bg-white p-4 shadow-sm'>
			<div>
				<h3 className='text-lg font-semibold text-gray-900'>
					Resumen del combo
				</h3>
				<p className='text-sm text-blush-500'>
					Costos, empaque y margen estimado
				</p>
			</div>

			<div className='space-y-2 text-sm'>
				<div className='flex items-center justify-between'>
					<span className='text-gray-600'>Total productos</span>
					<span className='font-medium text-gray-900'>
						{formatter.format(totals.productsCost)}
					</span>
				</div>
				<div className='flex items-center justify-between'>
					<span className='text-gray-600'>Empaque</span>
					<span className='font-medium text-gray-900'>
						{formatter.format(packagingCost)}
					</span>
				</div>
				<div className='flex items-center justify-between border-t border-dashed border-gray-200 pt-2'>
					<span className='text-gray-600'>Costo total</span>
					<span className='font-semibold text-gray-900'>
						{formatter.format(totals.totalCost)}
					</span>
				</div>
				{totals.hasSuggestedPrice && (
					<div className='flex items-center justify-between border-t border-dashed border-gray-200 pt-2'>
						<span className='text-gray-600'>Precio sugerido</span>
						<span className='font-semibold text-gray-900'>
							{formatter.format(suggestedPrice ?? 0)}
						</span>
					</div>
				)}
				{totals.profit !== null && (
					<div className='flex items-center justify-between'>
						<span className='text-gray-600'>Ganancia estimada</span>
						<span
							className={`font-semibold ${
								totals.profit >= 0 ? "text-blush-600" : "text-red-500"
							}`}>
							{formatter.format(totals.profit)}
						</span>
					</div>
				)}
			</div>

			<div className='rounded-md bg-blush-50 p-3 text-xs text-blush-600'>
				Las cifras mostradas son referenciales. Ajusta los márgenes en el
				siguiente paso cuando guardes el combo.
			</div>
		</div>
	);
}
