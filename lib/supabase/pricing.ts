// lib/pricing.ts
// Utility for computing price recommendations based on cost and category

export type PriceTiers = {
	m40: number;
	m50: number;
	m60: number;
	m70: number;
	suggested: number;
};

export interface PricingOptions {
	category?: string;
	premiumCutoff?: number; // threshold for premium margin
	endings?: string[]; // price endings like ['9', '0']
	currency?: string; // optional currency label
}

/**
 * Ensures prices end with a "pretty" digit (e.g. 9 or 0)
 */
function prettyPrice(value: number, endings: string[] = ["9", "0"]): number {
	const rounded = Math.round(value);
	const str = String(rounded);
	const end = endings[0] ?? "9";
	return Number(str.slice(0, -1) + end);
}

/**
 * Recommends pricing tiers (40/50/60/70%) and a default suggested price
 * depending on cost, category, and optional thresholds.
 */
export function recommendPrice(
	cost: number,
	opts: PricingOptions = {},
): PriceTiers {
	if (isNaN(cost) || cost <= 0) throw new Error("Invalid cost value");

	const endings = opts.endings ?? ["9", "0"];
	const premiumCutoff = opts.premiumCutoff ?? 1200;

	const isPremium =
		(opts.category?.toLowerCase().includes("perfume") ||
			opts.category?.toLowerCase().includes("premium")) ??
		(false || cost >= premiumCutoff);

	const isLowTicket = cost <= 150;

	const m40 = prettyPrice(cost * 1.4, endings);
	const m50 = prettyPrice(cost * 1.5, endings);
	const m60 = prettyPrice(cost * 1.6, endings);
	const m70 = prettyPrice(cost * 1.7, endings);

	const suggested = prettyPrice(
		isPremium ? cost * 1.7 : isLowTicket ? cost * 1.5 : cost * 1.6,
		endings,
	);

	return { m40, m50, m60, m70, suggested };
}

/**
 * Helper to format output for UI (optional)
 */
export function formatPrice(value: number, currency = "NIO"): string {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(value);
}

// Example usage:
// const tiers = recommendPrice(800, { category: 'Maquillaje' });
// console.log(tiers); // { m40: 1120, m50: 1200, m60: 1280, m70: 1360, suggested: 1280 }
