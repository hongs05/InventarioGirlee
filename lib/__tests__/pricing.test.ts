import { describe, expect, it } from "vitest";

import { prettyPrice, recommendPrice } from "../pricing";

describe("prettyPrice", () => {
	it("finds the nearest pretty price ending in 9 or 0", () => {
		const result = prettyPrice(1243, ["9", "0"]);
		expect(result).toBe(1240);
	});

	it("supports multi-digit endings", () => {
		const result = prettyPrice(189.2, ["95"]);
		expect(result).toBe(195);
	});

	it("falls back to rounding when endings are invalid", () => {
		const result = prettyPrice(199.75, []);
		expect(result).toBe(199.75);
	});
});

describe("recommendPrice", () => {
	it("computes default tiers and selects low ticket margin for inexpensive items", () => {
		const result = recommendPrice({ costPrice: 100 });
		expect(result.m40).toBe(140);
		expect(result.m50).toBe(150);
		expect(result.m60).toBe(160);
		expect(result.m70).toBe(170);
		expect(result.appliedTier).toBe("mid");
		expect(result.suggested).toBe(result.m50);
	});

	it("prefers premium margin for high ticket products", () => {
		const result = recommendPrice({ costPrice: 1500 });
		expect(result.appliedTier).toBe("premium");
		expect(result.suggested).toBe(result.m70);
	});

	it("uses premium margin for premium categories", () => {
		const result = recommendPrice({
			costPrice: 400,
			categoryName: "Perfumería",
		});
		expect(result.appliedTier).toBe("premium");
		expect(result.suggested).toBe(result.m70);
	});

	it("respects custom margin rules and endings", () => {
		const result = recommendPrice({
			costPrice: 200,
			rule: {
				margin_low: 0.3,
				margin_mid: 0.45,
				margin_high: 0.55,
				margin_premium: 0.8,
				endings: ["95"],
			},
		});

		expect(String(result.m40)).toMatch(/95$/);
		expect(String(result.m50)).toMatch(/95$/);
		expect(String(result.m60)).toMatch(/95$/);
		expect(String(result.m70)).toMatch(/95$/);
		expect(result.m70).toBeGreaterThan(result.m60);
		expect(result.endings).toEqual(["95"]);
	});

	it("throws for invalid cost price", () => {
		expect(() => recommendPrice({ costPrice: -10 })).toThrow();
	});
});
