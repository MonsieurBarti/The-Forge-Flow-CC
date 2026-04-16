import { describe, expect, it } from "vitest";
import {
	parseDifficultyOverride,
	computeTaskDifficulty,
	type TaskDifficultyInput,
} from "../../../../src/application/planning/task-difficulty.js";
import type { ComplexityTier } from "../../../../src/domain/value-objects/complexity-tier.js";

describe("task-difficulty", () => {
	describe("parseDifficultyOverride", () => {
		it("should return null when no difficulty override present", () => {
			const taskBlock = `### Task 1: Some Task
**Files:** src/file.ts
**Description:** Does something`;
			expect(parseDifficultyOverride(taskBlock)).toBeNull();
		});

		it("should parse low difficulty override", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:** low
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBe("low");
		});

		it("should parse medium difficulty override", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:** medium
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBe("medium");
		});

		it("should parse high difficulty override", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:** high
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBe("high");
		});

		it("should parse difficulty with extra spaces", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:**   high  
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBe("high");
		});

		it("should return null for invalid difficulty value", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:** critical
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBeNull();
		});

		it("should be case-insensitive", () => {
			const taskBlock = `### Task 1: Some Task
**Difficulty:** HIGH
**Files:** src/file.ts`;
			expect(parseDifficultyOverride(taskBlock)).toBe("high");
		});
	});

	describe("computeTaskDifficulty", () => {
		const makeInput = (
			overrides: Partial<TaskDifficultyInput> = {},
		): TaskDifficultyInput => ({
			title: "Test task",
			description: undefined,
			files: ["src/file.ts"],
			keywords: [],
			hasDeps: false,
			isDep: false,
			waveDepth: 0,
			maxWave: 0,
			sliceTier: "S" as ComplexityTier,
			manualOverride: null,
			...overrides,
		});

		it("should use manual override when provided", () => {
			const input = makeInput({ manualOverride: "high" });
			expect(computeTaskDifficulty(input)).toBe("high");
		});

		it("should compute difficulty when no override", () => {
			const input = makeInput({
				files: ["src/file.ts"],
				keywords: ["fix"],
				sliceTier: "S",
			});
			expect(computeTaskDifficulty(input)).toBe("low");
		});

		it("should extract keywords from title", () => {
			const input = makeInput({
				title: "Refactor the auth module",
				files: ["src/auth.ts"],
				keywords: [],
				sliceTier: "F-full",
			});
			// "refactor" keyword should be extracted from title
			expect(computeTaskDifficulty(input)).toBe("high");
		});

		it("should use provided keywords over title extraction", () => {
			const input = makeInput({
				title: "Update configuration",
				files: ["src/config.ts"],
				keywords: ["refactor"], // explicit keyword
				sliceTier: "F-full",
			});
			expect(computeTaskDifficulty(input)).toBe("high");
		});

		it("should default to medium when signals are ambiguous", () => {
			const input = makeInput({
				files: ["src/a.ts", "src/b.ts", "src/c.ts"],
				keywords: ["update"],
				hasDeps: false,
				isDep: false,
				waveDepth: 1,
				maxWave: 2,
				sliceTier: "F-lite",
			});
			expect(computeTaskDifficulty(input)).toBe("medium");
		});

		it("should handle empty files array", () => {
			const input = makeInput({
				files: [],
				keywords: [],
				sliceTier: "S",
			});
			// Should not crash, use defaults
			expect(computeTaskDifficulty(input)).toBe("low");
		});
	});
});
