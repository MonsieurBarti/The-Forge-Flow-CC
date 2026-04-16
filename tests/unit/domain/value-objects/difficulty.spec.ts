import { describe, expect, it } from "vitest";
import {
	DIFFICULTY_THRESHOLDS,
	DIFFICULTY_WEIGHTS,
	DifficultySchema,
	ModelProfileSchema,
} from "../../../../src/domain/value-objects/difficulty.js";

describe("Difficulty", () => {
	it("should accept valid difficulty values", () => {
		expect(DifficultySchema.parse("low")).toBe("low");
		expect(DifficultySchema.parse("medium")).toBe("medium");
		expect(DifficultySchema.parse("high")).toBe("high");
	});

	it("should reject invalid difficulty values", () => {
		expect(() => DifficultySchema.parse("critical")).toThrow();
		expect(() => DifficultySchema.parse("LOW")).toThrow();
	});

	it("should have correct threshold configuration", () => {
		expect(DIFFICULTY_THRESHOLDS.low.max).toBe(0.4);
		expect(DIFFICULTY_THRESHOLDS.medium.min).toBe(0.4);
		expect(DIFFICULTY_THRESHOLDS.medium.max).toBe(0.7);
		expect(DIFFICULTY_THRESHOLDS.high.min).toBe(0.7);
	});

	it("should have correct weight configuration", () => {
		expect(DIFFICULTY_WEIGHTS.fileScope).toBe(0.35);
		expect(DIFFICULTY_WEIGHTS.semanticHints).toBe(0.25);
		expect(DIFFICULTY_WEIGHTS.dependencyRole).toBe(0.2);
		expect(DIFFICULTY_WEIGHTS.sliceTier).toBe(0.2);
	});

	it("weights should sum to 1.0", () => {
		const total = Object.values(DIFFICULTY_WEIGHTS).reduce((a, b) => a + b, 0);
		expect(total).toBeCloseTo(1.0, 10);
	});
});

describe("ModelProfile", () => {
	it("should accept valid profile values", () => {
		expect(ModelProfileSchema.parse("budget")).toBe("budget");
		expect(ModelProfileSchema.parse("balanced")).toBe("balanced");
		expect(ModelProfileSchema.parse("quality")).toBe("quality");
	});

	it("should reject invalid profile values", () => {
		expect(() => ModelProfileSchema.parse("premium")).toThrow();
	});
});
