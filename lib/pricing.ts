const DEFAULT_MARGINS = {
	low: 0.4,
	mid: 0.5,
	high: 0.6,
	premium: 0.7,
} as const;

const DEFAULT_ENDINGS = ["9", "0"] as const;
const PREMIUM_CATEGORIES = new Set(["Perfumería", "Premium"]);
const LOW_TICKET_THRESHOLD = 150;
const HIGH_TICKET_THRESHOLD = 1200;
const MAX_SEARCH_DISTANCE = 500; // search window for pretty pricing adjustments

type MarginKey = keyof typeof DEFAULT_MARGINS;

export type PriceRuleTarget = "product" | "combo";
export type PriceRuleScope =
	| "global"
	| "category"
	| "brand"
	| "product"
	| "promo"
	| "combo";

export type InventoryAgeCondition = {
	minDays?: number | null;
	maxDays?: number | null;
	strategy?: "any" | "all";
};

export type CostChangeDirection = "increase" | "decrease" | "any";

export type CostChangeCondition = {
	direction?: CostChangeDirection | null;
	thresholdPct?: number | null;
};

export type PromoCondition = {
	tag?: string | null;
};

export interface PriceRuleConditions {
	inventoryAge?: InventoryAgeCondition | null;
	costChange?: CostChangeCondition | null;
	promo?: PromoCondition | null;
}

export interface PriceRule {
	id?: number;
	name?: string | null;
	description?: string | null;
	target?: PriceRuleTarget | null;
	scope?: PriceRuleScope | null;
	scope_ref?: string | null;
	margin_low?: number | null;
	margin_mid?: number | null;
	margin_high?: number | null;
	margin_premium?: number | null;
	endings?: string[] | null;
	active?: boolean | null;
	priority?: number | null;
	price_adjustment_pct?: number | null;
	conditions?: PriceRuleConditions | Record<string, unknown> | null;
	starts_at?: string | null;
	ends_at?: string | null;
}

export interface PriceRecommendationInput {
	costPrice: number;
	categoryName?: string | null;
	brand?: string | null;
	rule?: PriceRule | null;
}

export interface PriceRecommendation {
	m40: number;
	m50: number;
	m60: number;
	m70: number;
	suggested: number;
	appliedMargin: number;
	appliedTier: MarginKey;
	endings: string[];
}

export function prettyPrice(
	value: number,
	endings: string[] = Array.from(DEFAULT_ENDINGS),
): number {
	if (!Number.isFinite(value)) {
		throw new Error("Price must be a finite number");
	}

	const normalizedEndings = normalizeEndings(endings);
	if (normalizedEndings.length === 0) {
		return roundCurrency(value);
	}

	const integerTarget = Math.round(value);
	let bestCandidate = integerTarget;
	let bestDiff = Number.POSITIVE_INFINITY;

	const minCandidate = Math.max(1, integerTarget - MAX_SEARCH_DISTANCE);
	const maxCandidate = integerTarget + MAX_SEARCH_DISTANCE;

	for (let candidate = minCandidate; candidate <= maxCandidate; candidate++) {
		const candidateStr = Math.abs(candidate).toString();
		if (!normalizedEndings.some((ending) => candidateStr.endsWith(ending))) {
			continue;
		}

		const diff = Math.abs(candidate - value);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestCandidate = candidate;
		}
	}

	if (!Number.isFinite(bestDiff)) {
		return roundCurrency(value);
	}

	return roundCurrency(bestCandidate);
}

export function recommendPrice({
	costPrice,
	categoryName,
	brand,
	rule,
}: PriceRecommendationInput): PriceRecommendation {
	if (!Number.isFinite(costPrice) || costPrice <= 0) {
		throw new Error("costPrice must be a positive number");
	}

	const endings = normalizeEndings(
		rule?.endings ?? Array.from(DEFAULT_ENDINGS),
	);
	const margins = resolveMargins(rule);
	const priceAdjustmentPct = resolvePriceAdjustment(rule);
	const adjustPrice = (value: number) =>
		applyPriceAdjustment(value, priceAdjustmentPct, endings);

	const m40 = adjustPrice(applyMargin(costPrice, margins.low, endings));
	const m50 = adjustPrice(applyMargin(costPrice, margins.mid, endings));
	const m60 = adjustPrice(applyMargin(costPrice, margins.high, endings));
	const m70 = adjustPrice(applyMargin(costPrice, margins.premium, endings));

	const appliedTier = pickSuggestedTier(costPrice, categoryName, brand);
	const appliedMargin = margins[appliedTier];

	const suggestedByTier: Record<MarginKey, number> = {
		low: m40,
		mid: m50,
		high: m60,
		premium: m70,
	};

	return {
		m40,
		m50,
		m60,
		m70,
		suggested: suggestedByTier[appliedTier],
		appliedMargin,
		appliedTier,
		endings,
	};
}

function resolveMargins(rule: PriceRule | null | undefined) {
	return {
		low: pickMargin(rule?.margin_low, DEFAULT_MARGINS.low),
		mid: pickMargin(rule?.margin_mid, DEFAULT_MARGINS.mid),
		high: pickMargin(rule?.margin_high, DEFAULT_MARGINS.high),
		premium: pickMargin(rule?.margin_premium, DEFAULT_MARGINS.premium),
	} as Record<MarginKey, number>;
}

function resolvePriceAdjustment(rule: PriceRule | null | undefined): number {
	const candidate = rule?.price_adjustment_pct;
	if (candidate === null || candidate === undefined) {
		return 0;
	}

	const parsed = Number(candidate);
	return Number.isFinite(parsed) ? parsed : 0;
}

function pickMargin(
	candidate: number | null | undefined,
	fallback: number,
): number {
	if (candidate === null || candidate === undefined) {
		return fallback;
	}

	if (!Number.isFinite(candidate) || candidate < 0) {
		return fallback;
	}

	return candidate;
}

function pickSuggestedTier(
	costPrice: number,
	categoryName?: string | null,
	brand?: string | null,
): MarginKey {
	if (costPrice >= HIGH_TICKET_THRESHOLD) {
		return "premium";
	}

	if (categoryName && PREMIUM_CATEGORIES.has(categoryName)) {
		return "premium";
	}

	if (brand && PREMIUM_CATEGORIES.has(brand)) {
		return "premium";
	}

	if (costPrice <= LOW_TICKET_THRESHOLD) {
		return "mid";
	}

	return "high";
}

function applyMargin(
	costPrice: number,
	margin: number,
	endings: string[],
): number {
	const raw = costPrice * (1 + margin);
	return prettyPrice(raw, endings);
}

function applyPriceAdjustment(
	value: number,
	priceAdjustmentPct: number,
	endings: string[],
): number {
	if (!priceAdjustmentPct) {
		return value;
	}

	const adjusted = value * (1 + priceAdjustmentPct / 100);
	return prettyPrice(adjusted, endings);
}

function normalizeEndings(endings: string[]): string[] {
	return endings
		.map((ending) => ending?.toString().trim())
		.filter((ending) => ending.length > 0)
		.map((ending) => ending.replace(/[^0-9]/g, ""))
		.filter((ending) => ending.length > 0);
}

function roundCurrency(value: number): number {
	return Number(value.toFixed(2));
}
