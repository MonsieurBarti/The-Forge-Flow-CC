import { describe, expect, it } from "vitest";
import {
	classifyDifficulty,
	computeDependencyScore,
	computeFileScopeScore,
	computeSemanticScore,
	computeTierScore,
	type DifficultySignals,
	difficultyToProfile,
	resolveModelFromProfile,
} from "../../../../src/application/classification/difficulty-classifier.js";
import type { ComplexityTier } from "../../../../src/domain/value-objects/complexity-tier.js";

describe("difficulty-classifier", () => {
	describe("computeFileScopeScore", () => {
		it("returns 0.1 for single file (log10(1)=0, filesTouched/10=0.1)", () => {
			expect(computeFileScopeScore(1, 1)).toBeCloseTo(0.1, 10);
		});

		it("increases with file count", () => {
			const single = computeFileScopeScore(1, 1);
			const multiple = computeFileScopeScore(10, 5);
			expect(multiple).toBeGreaterThan(single);
		});

		it("handles filesTouched contribution", () => {
			const score1 = computeFileScopeScore(5, 5);
			const score2 = computeFileScopeScore(5, 10);
			expect(score2).toBeGreaterThan(score1);
		});
	});

	describe("computeSemanticScore", () => {
		it("returns 0 for empty keywords", () => {
			expect(computeSemanticScore([])).toBe(0);
		});

		it("returns 2.0 for refactor keyword", () => {
			expect(computeSemanticScore(["refactor"])).toBe(2.0);
		});

		it("returns 1.5 for implement keyword", () => {
			expect(computeSemanticScore(["implement"])).toBe(1.5);
		});

		it("returns 0.5 for fix keyword", () => {
			expect(computeSemanticScore(["fix"])).toBe(0.5);
		});

		it("returns highest score for multiple keywords", () => {
			expect(computeSemanticScore(["fix", "refactor"])).toBe(2.0);
		});

		it("returns 0.5 default for unknown keywords", () => {
			expect(computeSemanticScore(["unknown-task"])).toBe(0.5);
		});
	});

	describe("computeDependencyScore", () => {
		it("returns 0 for task with no dependencies", () => {
			expect(computeDependencyScore(false, false, 0, 2)).toBe(0);
		});

		it("adds 1 for hasDeps", () => {
			expect(computeDependencyScore(true, false, 0, 2)).toBe(1);
		});

		it("adds 0.5 for isDep", () => {
			expect(computeDependencyScore(false, true, 0, 2)).toBe(0.5);
		});

		it("adds wave contribution", () => {
			expect(computeDependencyScore(false, false, 1, 2)).toBe(0.5);
		});

		it("combines all factors", () => {
			// hasDeps=1 + isDep=0.5 + waveDepth/maxWave=1
			expect(computeDependencyScore(true, true, 2, 2)).toBe(2.5);
		});
	});

	describe("computeTierScore", () => {
		it("returns 0 for S tier", () => {
			expect(computeTierScore("S" as ComplexityTier)).toBe(0);
		});

		it("returns 0.5 for F-lite tier", () => {
			expect(computeTierScore("F-lite" as ComplexityTier)).toBe(0.5);
		});

		it("returns 1 for F-full tier", () => {
			expect(computeTierScore("F-full" as ComplexityTier)).toBe(1);
		});
	});

	describe("classifyDifficulty", () => {
		it("classifies low difficulty for small scoped tasks", () => {
			const signals: DifficultySignals = {
				fileCount: 1,
				filesTouched: 1,
				keywords: ["fix"],
				hasDeps: false,
				isDep: false,
				waveDepth: 0,
				maxWave: 1,
				sliceTier: "S" as ComplexityTier,
			};
			expect(classifyDifficulty(signals)).toBe("low");
		});

		it("classifies high difficulty for large scoped tasks", () => {
			const signals: DifficultySignals = {
				fileCount: 10,
				filesTouched: 10,
				keywords: ["refactor"],
				hasDeps: true,
				isDep: true,
				waveDepth: 2,
				maxWave: 2,
				sliceTier: "F-full" as ComplexityTier,
			};
			expect(classifyDifficulty(signals)).toBe("high");
		});

		it("classifies medium difficulty for moderate tasks", () => {
			const signals: DifficultySignals = {
				fileCount: 3,
				filesTouched: 2,
				keywords: ["update"],
				hasDeps: false,
				isDep: false,
				waveDepth: 1,
				maxWave: 2,
				sliceTier: "F-lite" as ComplexityTier,
			};
			expect(classifyDifficulty(signals)).toBe("medium");
		});

		it("handles maxWave = 0 (no division by zero)", () => {
			const signals: DifficultySignals = {
				fileCount: 1,
				filesTouched: 1,
				keywords: [],
				hasDeps: false,
				isDep: false,
				waveDepth: 0,
				maxWave: 0,
				sliceTier: "S" as ComplexityTier,
			};
			expect(() => classifyDifficulty(signals)).not.toThrow();
		});
	});

	describe("difficultyToProfile", () => {
		it("maps low to budget", () => {
			expect(difficultyToProfile("low")).toBe("budget");
		});

		it("maps medium to balanced", () => {
			expect(difficultyToProfile("medium")).toBe("balanced");
		});

		it("maps high to quality", () => {
			expect(difficultyToProfile("high")).toBe("quality");
		});
	});

	describe("resolveModelFromProfile", () => {
		const defaultSettings = {
			"model-profiles": {
				quality: { model: "claude-opus-4-20250514" },
				balanced: { model: "claude-sonnet-4-20250514" },
				budget: { model: "claude-3-5-haiku-20241022" },
			},
		};

		it("returns configured model for quality profile", () => {
			expect(resolveModelFromProfile("quality", defaultSettings)).toBe("claude-opus-4-20250514");
		});

		it("returns configured model for balanced profile", () => {
			expect(resolveModelFromProfile("balanced", defaultSettings)).toBe("claude-sonnet-4-20250514");
		});

		it("returns configured model for budget profile", () => {
			expect(resolveModelFromProfile("budget", defaultSettings)).toBe("claude-3-5-haiku-20241022");
		});

		it("falls back to opus for missing quality profile", () => {
			const settings = { "model-profiles": {} };
			expect(resolveModelFromProfile("quality", settings)).toBe("opus");
		});

		it("falls back to sonnet for missing balanced profile", () => {
			const settings = { "model-profiles": {} };
			expect(resolveModelFromProfile("balanced", settings)).toBe("sonnet");
		});

		it("falls back to haiku for missing budget profile", () => {
			const settings = { "model-profiles": {} };
			expect(resolveModelFromProfile("budget", settings)).toBe("haiku");
		});
	});
});
