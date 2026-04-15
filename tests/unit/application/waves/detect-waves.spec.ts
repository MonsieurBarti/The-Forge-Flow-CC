import { describe, expect, it } from "vitest";
import { detectWaves, detectWavesFromStores } from "../../../src/application/waves/detect-waves.js";
import { isErr, isOk } from "../../src/../src/domain/result.js";
import { InMemoryStateAdapter } from "../../src/../src/infrastructure/testing/in-memory-state-adapter.js";

describe("detectWaves", () => {
	it("should put independent tasks in wave 0", () => {
		const result = detectWaves([
			{ id: "t1", dependsOn: [] },
			{ id: "t2", dependsOn: [] },
			{ id: "t3", dependsOn: [] },
		]);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0].index).toBe(0);
			expect(result.data[0].taskIds).toEqual(["t1", "t2", "t3"]);
		}
	});

	it("should create sequential waves for linear dependencies", () => {
		const result = detectWaves([
			{ id: "t1", dependsOn: [] },
			{ id: "t2", dependsOn: ["t1"] },
			{ id: "t3", dependsOn: ["t2"] },
		]);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(3);
			expect(result.data[0].taskIds).toEqual(["t1"]);
			expect(result.data[1].taskIds).toEqual(["t2"]);
			expect(result.data[2].taskIds).toEqual(["t3"]);
		}
	});

	it("should group parallel tasks with same dependencies", () => {
		const result = detectWaves([
			{ id: "t1", dependsOn: [] },
			{ id: "t2", dependsOn: ["t1"] },
			{ id: "t3", dependsOn: ["t1"] },
			{ id: "t4", dependsOn: ["t2", "t3"] },
		]);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(3);
			expect(result.data[0].taskIds).toEqual(["t1"]);
			expect(result.data[1].taskIds).toContain("t2");
			expect(result.data[1].taskIds).toContain("t3");
			expect(result.data[2].taskIds).toEqual(["t4"]);
		}
	});

	it("should detect circular dependencies", () => {
		const result = detectWaves([
			{ id: "t1", dependsOn: ["t2"] },
			{ id: "t2", dependsOn: ["t1"] },
		]);
		expect(isErr(result)).toBe(true);
	});

	it("should name specific tasks in cycle detection error", () => {
		const tasks = [
			{ id: "T01", dependsOn: ["T02"] },
			{ id: "T02", dependsOn: ["T03"] },
			{ id: "T03", dependsOn: ["T01"] },
		];
		const result = detectWaves(tasks);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.message).toContain("T01");
			expect(result.error.message).toContain("T02");
			expect(result.error.message).toContain("T03");
		}
	});

	it("should handle empty input", () => {
		const result = detectWaves([]);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data).toHaveLength(0);
	});
});

describe("detectWavesFromStores", () => {
	it("loads tasks and deps from stores and delegates to detectWaves", () => {
		const adapter = new InMemoryStateAdapter();
		adapter.init();
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Foundation" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "Build", wave: 1 });
		adapter.createTask({ sliceId: "M01-S01", number: 3, title: "Test", wave: 1 });
		adapter.addDependency("M01-S01-T02", "M01-S01-T01", "blocks");
		adapter.addDependency("M01-S01-T03", "M01-S01-T01", "blocks");

		const result = detectWavesFromStores(
			{ taskStore: adapter, dependencyStore: adapter },
			"M01-S01",
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(2);
			expect(result.data[0].taskIds).toEqual(["M01-S01-T01"]);
			expect(result.data[1].taskIds).toEqual(["M01-S01-T02", "M01-S01-T03"]);
		}
	});

	it("returns empty waves for slice with no tasks", () => {
		const adapter = new InMemoryStateAdapter();
		adapter.init();
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "M1" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S1" });

		const result = detectWavesFromStores(
			{ taskStore: adapter, dependencyStore: adapter },
			"M01-S01",
		);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.data).toHaveLength(0);
	});
});
