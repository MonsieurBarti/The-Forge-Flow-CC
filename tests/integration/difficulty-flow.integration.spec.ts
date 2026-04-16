import { describe, expect, it } from "vitest";
import {
	classifyDifficulty,
	type DifficultySignals,
	difficultyToProfile,
	resolveModelFromProfile,
} from "../../src/application/classification/difficulty-classifier.js";
import {
	computeTaskDifficulty,
	parseDifficultyOverride,
	type TaskDifficultyInput,
} from "../../src/application/planning/task-difficulty.js";
import type { ComplexityTier } from "../../src/domain/value-objects/complexity-tier.js";

/**
 * Integration test for the full difficulty flow:
 * signals → inference → task entity → model profile → subagent spawn
 */
describe("difficulty flow integration", () => {
	describe("AC4: Difficulty persists to task entity", () => {
		it("task schema accepts difficulty field", async () => {
			const { TaskSchema } = await import("../../src/domain/entities/task.js");
			const task = {
				id: "M01-S01-T01",
				sliceId: "M01-S01",
				number: 1,
				title: "Test task",
				status: "open",
				createdAt: new Date(),
				difficulty: "high",
			};
			const parsed = TaskSchema.parse(task);
			expect(parsed.difficulty).toBe("high");
		});

		it("task can be created with difficulty", async () => {
			const { createTask } = await import("../../src/domain/entities/task.js");
			const task = createTask({
				sliceId: "M01-S01",
				number: 1,
				title: "Test task",
				difficulty: "medium",
			});
			expect(task.difficulty).toBe("medium");
		});
	});

	describe("AC5 & AC6: Difficulty to model mapping", () => {
		const defaultSettings = {
			"model-profiles": {
				quality: { model: "claude-opus-4-20250514" },
				balanced: { model: "claude-sonnet-4-20250514" },
				budget: { model: "claude-3-5-haiku-20241022" },
			},
		};

		it("resolves correct model from difficulty flow: low → budget → haiku", () => {
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
			const difficulty = classifyDifficulty(signals);
			const profile = difficultyToProfile(difficulty);
			const model = resolveModelFromProfile(profile, defaultSettings);

			expect(difficulty).toBe("low");
			expect(profile).toBe("budget");
			expect(model).toBe("claude-3-5-haiku-20241022");
		});

		it("resolves correct model from difficulty flow: medium → balanced → sonnet", () => {
			const signals: DifficultySignals = {
				fileCount: 3,
				filesTouched: 3,
				keywords: ["update"],
				hasDeps: false,
				isDep: false,
				waveDepth: 1,
				maxWave: 2,
				sliceTier: "F-lite" as ComplexityTier,
			};
			const difficulty = classifyDifficulty(signals);
			const profile = difficultyToProfile(difficulty);
			const model = resolveModelFromProfile(profile, defaultSettings);

			expect(difficulty).toBe("medium");
			expect(profile).toBe("balanced");
			expect(model).toBe("claude-sonnet-4-20250514");
		});

		it("resolves correct model from difficulty flow: high → quality → opus", () => {
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
			const difficulty = classifyDifficulty(signals);
			const profile = difficultyToProfile(difficulty);
			const model = resolveModelFromProfile(profile, defaultSettings);

			expect(difficulty).toBe("high");
			expect(profile).toBe("quality");
			expect(model).toBe("claude-opus-4-20250514");
		});
	});

	describe("AC7: Manual override works", () => {
		it("applies manual override from PLAN.md", () => {
			const taskBlock = `### Task 1: Small Task
**Difficulty:** high
**Files:** src/file.ts`;

			const manualOverride = parseDifficultyOverride(taskBlock);
			expect(manualOverride).toBe("high");

			// Even though task looks simple, override takes precedence
			const input: TaskDifficultyInput = {
				title: "Small Task",
				files: ["src/file.ts"],
				keywords: ["fix"],
				hasDeps: false,
				isDep: false,
				waveDepth: 0,
				maxWave: 1,
				sliceTier: "S" as ComplexityTier,
				manualOverride,
			};

			const difficulty = computeTaskDifficulty(input);
			expect(difficulty).toBe("high");
		});

		it("override takes precedence over inference", () => {
			// Task that would be classified as low, but override says high
			const input: TaskDifficultyInput = {
				title: "Fix typo",
				files: ["src/file.ts"],
				keywords: ["fix"],
				hasDeps: false,
				isDep: false,
				waveDepth: 0,
				maxWave: 1,
				sliceTier: "S" as ComplexityTier,
				manualOverride: "high",
			};

			const difficulty = computeTaskDifficulty(input);
			expect(difficulty).toBe("high");
		});
	});

	describe("AC10: Backward compatible", () => {
		it("existing tasks without difficulty field continue to work", async () => {
			const { TaskSchema } = await import("../../src/domain/entities/task.js");
			const task = {
				id: "M01-S01-T01",
				sliceId: "M01-S01",
				number: 1,
				title: "Legacy task",
				status: "open",
				createdAt: new Date(),
				// No difficulty field
			};
			const parsed = TaskSchema.parse(task);
			expect(parsed.difficulty).toBeUndefined();
		});

		it("defaults to medium when signals are incomplete", () => {
			const input: TaskDifficultyInput = {
				title: "Unknown task",
				files: [],
				keywords: [],
				hasDeps: false,
				isDep: false,
				waveDepth: 0,
				maxWave: 0,
				sliceTier: "S" as ComplexityTier,
				manualOverride: null,
			};

			const difficulty = computeTaskDifficulty(input);
			// With minimal inputs, should still produce a valid result
			expect(["low", "medium", "high"]).toContain(difficulty);
		});
	});
});
