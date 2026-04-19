import { describe, expect, it } from "vitest";
import {
	ComplexityTierSchema,
	tierConfig,
} from "../../../../src/domain/value-objects/complexity-tier.js";

describe("ComplexityTier", () => {
	it("accepts S, SS, SSS", () => {
		expect(ComplexityTierSchema.safeParse("S").success).toBe(true);
		expect(ComplexityTierSchema.safeParse("SS").success).toBe(true);
		expect(ComplexityTierSchema.safeParse("SSS").success).toBe(true);
	});

	it("rejects legacy labels F-lite and F-full", () => {
		expect(ComplexityTierSchema.safeParse("F-lite").success).toBe(false);
		expect(ComplexityTierSchema.safeParse("F-full").success).toBe(false);
	});

	it("S has no brainstormer, no TDD, skipped research", () => {
		const cfg = tierConfig("S");
		expect(cfg.brainstormer).toBe(false);
		expect(cfg.research).toBe("skip");
		expect(cfg.tdd).toBe(false);
	});

	it("SS has brainstormer, optional research, TDD (former F-lite)", () => {
		const cfg = tierConfig("SS");
		expect(cfg.brainstormer).toBe(true);
		expect(cfg.research).toBe("optional");
		expect(cfg.tdd).toBe(true);
	});

	it("SSS has brainstormer, required research, TDD (former F-full)", () => {
		const cfg = tierConfig("SSS");
		expect(cfg.brainstormer).toBe(true);
		expect(cfg.research).toBe("required");
		expect(cfg.tdd).toBe(true);
	});
});
