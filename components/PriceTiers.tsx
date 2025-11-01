"use client";

import { useMemo } from "react";
import type { PriceRecommendation } from "@/lib/pricing";

type PriceTiersProps = {
	recommendation?: PriceRecommendation | null;
	currency?: string;
	onSelectTier?: (tier: PriceRecommendation["appliedTier"]) => void;
};

const tierLabels: Record<PriceRecommendation["appliedTier"], string> = {
	low: "+40%",
	mid: "+50%",
	high: "+60%",
	premium: "+70%",
};

const orderedTiers: Array<PriceRecommendation["appliedTier"]> = [
	"low",
	"mid",
	"high",
	"premium",
];

export function PriceTiers({
	recommendation,
	currency = "NIO",
	onSelectTier,
}: PriceTiersProps) {
	const formatter = useMemo(
		() => new Intl.NumberFormat("es-NI", { style: "currency", currency }),
		[currency],
	);

	if (!recommendation) {
		return (
			<div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500'>
				Calcula una recomendación ingresando el costo y seleccionando
				&quot;Obtener recomendaciones&quot;.
			</div>
		);
	}

	const tierValues: Record<PriceRecommendation["appliedTier"], number> = {
		low: recommendation.m40,
		mid: recommendation.m50,
		high: recommendation.m60,
		premium: recommendation.m70,
	};

	return (
		<div className='grid gap-3 sm:grid-cols-2'>
			{orderedTiers.map((tier) => {
				const value = tierValues[tier];
				const isSuggested = tier === recommendation.appliedTier;

				return (
					<button
						key={tier}
						type='button'
						onClick={() => onSelectTier?.(tier)}
						className={`flex flex-col rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
							isSuggested
								? "border-blue-500 bg-blue-50"
								: "border-gray-200 bg-white"
						}`}>
						<span className='text-sm font-medium text-gray-500'>
							{tierLabels[tier]}
						</span>
						<span className='text-2xl font-semibold text-gray-900'>
							{formatter.format(value)}
						</span>
						{isSuggested && (
							<span className='mt-2 inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white'>
								Sugerido
							</span>
						)}
					</button>
				);
			})}
			<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
				<p className='text-sm font-medium text-gray-500'>Precio sugerido</p>
				<p className='text-2xl font-semibold text-gray-900'>
					{formatter.format(recommendation.suggested)}
				</p>
				<p className='mt-1 text-xs text-gray-500'>
					Margen aplicado: {(recommendation.appliedMargin * 100).toFixed(0)}%
				</p>
			</div>
		</div>
	);
}
