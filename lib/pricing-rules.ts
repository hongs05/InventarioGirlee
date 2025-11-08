import {
	CostChangeCondition,
	CostChangeDirection,
	PriceRule,
	PriceRuleConditions,
} from "./pricing";

export type ProductPricingMetric = {
	productId: string;
	inventoryAgeDays: number | null;
	costChangePct: number | null;
};

export type ComboPricingContext = {
	categories: Array<{ id: string | null; name: string | null }>;
	promoTag?: string | null;
	inventoryAges: number[];
	costChanges: number[];
	now?: Date;
};

export function parseRuleConditions(
	value: unknown,
): PriceRuleConditions | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const source = value as Record<string, unknown>;
	const inventoryAge = normalizeInventoryAge(source.inventoryAge);
	const costChange = normalizeCostChange(source.costChange);
	const promo = normalizePromo(source.promo);

	if (!inventoryAge && !costChange && !promo) {
		return null;
	}

	return {
		inventoryAge,
		costChange,
		promo,
	};
}

export function normalizeRule(rule: PriceRule): PriceRule {
	return {
		...rule,
		endings: Array.isArray(rule.endings)
			? rule.endings.map((ending) => ending?.toString() ?? "").filter(Boolean)
			: undefined,
		conditions: parseRuleConditions(rule.conditions ?? null) ?? undefined,
	};
}

export function ruleMatchesCombo(
	rule: PriceRule,
	context: ComboPricingContext,
): boolean {
	if (!rule) return false;

	const target = rule.target ?? "product";
	if (target !== "combo") {
		return false;
	}

	if (rule.active === false) {
		return false;
	}

	const now = context.now ?? new Date();
	if (rule.starts_at && new Date(rule.starts_at) > now) {
		return false;
	}

	if (rule.ends_at && new Date(rule.ends_at) < now) {
		return false;
	}

	if (!matchesScope(rule, context)) {
		return false;
	}

	const conditions = parseRuleConditions(rule.conditions ?? null);
	if (!conditions) {
		return true;
	}

	if (
		conditions.inventoryAge &&
		!inventoryAgeConditionMatches(
			conditions.inventoryAge,
			context.inventoryAges,
		)
	) {
		return false;
	}

	if (
		conditions.costChange &&
		!costChangeConditionMatches(conditions.costChange, context.costChanges)
	) {
		return false;
	}

	if (
		conditions.promo &&
		!promoConditionMatches(conditions.promo, context.promoTag)
	) {
		return false;
	}

	return true;
}

export function selectBestRule(
	rules: PriceRule[],
	context: ComboPricingContext,
): PriceRule | null {
	const ordered = [...rules].sort((a, b) => {
		const priorityA = a.priority ?? 100;
		const priorityB = b.priority ?? 100;
		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}

		const idA = a.id ?? Number.MAX_SAFE_INTEGER;
		const idB = b.id ?? Number.MAX_SAFE_INTEGER;
		return idA - idB;
	});

	for (const rule of ordered) {
		if (ruleMatchesCombo(rule, context)) {
			return rule;
		}
	}

	return null;
}

function matchesScope(rule: PriceRule, context: ComboPricingContext): boolean {
	const scope = rule.scope ?? "global";
	const reference = (rule.scope_ref ?? "").toLowerCase();

	switch (scope) {
		case "global":
			return true;
		case "category": {
			if (!reference) return false;
			return context.categories.some((category) => {
				const id = category.id?.toLowerCase() ?? "";
				const name = category.name?.toLowerCase() ?? "";
				return id === reference || name === reference;
			});
		}
		case "promo": {
			if (!reference) return false;
			return (context.promoTag ?? "").toLowerCase() === reference;
		}
		case "combo": {
			// allow targeting by combo id via scope_ref
			return false;
		}
		default:
			return false;
	}
}

function inventoryAgeConditionMatches(
	condition: NonNullable<PriceRuleConditions["inventoryAge"]>,
	inventoryAges: number[],
): boolean {
	if (!inventoryAges.length) {
		return false;
	}

	const minDays = condition?.minDays ?? null;
	const maxDays = condition?.maxDays ?? null;
	const minAge = Math.min(...inventoryAges);
	const maxAge = Math.max(...inventoryAges);

	if (minDays !== null && minDays !== undefined && maxAge < minDays) {
		return false;
	}

	if (maxDays !== null && maxDays !== undefined && minAge > maxDays) {
		return false;
	}

	return true;
}

function costChangeConditionMatches(
	condition: CostChangeCondition,
	costChanges: number[],
): boolean {
	if (!costChanges.length) {
		return false;
	}

	const direction: CostChangeDirection = condition.direction ?? "any";
	const threshold = condition.thresholdPct ?? 0;
	const increases = costChanges.filter((value) => value !== null && value >= 0);
	const decreases = costChanges.filter((value) => value !== null && value < 0);
	const maxIncrease = increases.length ? Math.max(...increases) : null;
	const maxDecrease = decreases.length ? Math.min(...decreases) : null; // most negative

	if (threshold <= 0) {
		return true;
	}

	if (direction === "increase") {
		return maxIncrease !== null && maxIncrease >= threshold;
	}

	if (direction === "decrease") {
		return maxDecrease !== null && Math.abs(maxDecrease) >= threshold;
	}

	const absIncrease = maxIncrease ?? 0;
	const absDecrease = maxDecrease !== null ? Math.abs(maxDecrease) : 0;
	return Math.max(absIncrease, absDecrease) >= threshold;
}

function promoConditionMatches(
	condition: NonNullable<PriceRuleConditions["promo"]>,
	promoTag: string | null | undefined,
): boolean {
	const expected = condition?.tag?.trim().toLowerCase();
	if (!expected) {
		return true;
	}

	return (promoTag ?? "").trim().toLowerCase() === expected;
}

function normalizeInventoryAge(value: unknown) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const minDays = toNumberOrNull(record.minDays);
	const maxDays = toNumberOrNull(record.maxDays);
	const strategy = isValidStrategy(record.strategy)
		? (record.strategy as "any" | "all")
		: undefined;

	if (minDays === null && maxDays === null && !strategy) {
		return null;
	}

	return { minDays, maxDays, strategy };
}

function normalizeCostChange(value: unknown): CostChangeCondition | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const direction = isValidDirection(record.direction)
		? (record.direction as CostChangeDirection)
		: undefined;
	const thresholdPct = toNumberOrNull(record.thresholdPct);

	if (!direction && thresholdPct === null) {
		return null;
	}

	return { direction, thresholdPct };
}

function normalizePromo(value: unknown) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const tag = typeof record.tag === "string" ? record.tag.trim() : null;

	if (!tag) {
		return null;
	}

	return { tag };
}

function toNumberOrNull(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function isValidStrategy(value: unknown): value is "any" | "all" {
	return value === "any" || value === "all";
}

function isValidDirection(value: unknown): value is CostChangeDirection {
	return value === "increase" || value === "decrease" || value === "any";
}
