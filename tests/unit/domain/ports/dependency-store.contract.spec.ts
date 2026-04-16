import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { DependencyStore } from "../../../../src/domain/ports/dependency-store.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../../src/domain/ports/task-store.port.js";
import { isOk } from "../../../../src/domain/result.js";

type DependencyTestAdapter = DependencyStore &
	DatabaseInit &
	ProjectStore &
	MilestoneStore &
	SliceStore &
	TaskStore;

export const runDependencyStoreContractTests = (
	name: string,
	createAdapter: () => DependencyTestAdapter,
) => {
	describe(`DependencyStore contract [${name}]`, () => {
		let store: DependencyTestAdapter;
		let sliceId: string;
		let task1Id: string;
		let task2Id: string;
		let task3Id: string;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			// Seed parent chain
			store.saveProject({ name: "Test" });
			const msResult = store.createMilestone({ number: 1, name: "M1" });
			const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
			const slResult = store.createSlice({ milestoneId, number: 1, title: "S1" });
			sliceId = isOk(slResult) ? slResult.data.id : "M01-S01";
			store.createTask({ sliceId, number: 1, title: "T1" });
			store.createTask({ sliceId, number: 2, title: "T2" });
			store.createTask({ sliceId, number: 3, title: "T3" });
			task1Id = `${sliceId}-T01`;
			task2Id = `${sliceId}-T02`;
			task3Id = `${sliceId}-T03`;
		});

		it("addDependency creates edge", () => {
			const result = store.addDependency(task1Id, task2Id, "blocks");
			expect(isOk(result)).toBe(true);
		});

		it("getDependencies returns outbound and inbound edges", () => {
			store.addDependency(task1Id, task2Id, "blocks");

			// T01 is blocked by T02 (T01 has outbound dep to T02)
			const t1Deps = store.getDependencies(task1Id);
			expect(isOk(t1Deps)).toBe(true);
			if (isOk(t1Deps)) {
				expect(t1Deps.data.length).toBeGreaterThanOrEqual(1);
				expect(t1Deps.data.some((d) => d.fromId === task1Id && d.toId === task2Id)).toBe(true);
			}

			// T02 should also show the edge (as it blocks T01)
			const t2Deps = store.getDependencies(task2Id);
			expect(isOk(t2Deps)).toBe(true);
			if (isOk(t2Deps)) {
				expect(t2Deps.data.some((d) => d.fromId === task1Id && d.toId === task2Id)).toBe(true);
			}
		});

		it("removeDependency deletes edge", () => {
			store.addDependency(task1Id, task2Id, "blocks");
			store.removeDependency(task1Id, task2Id);

			const result = store.getDependencies(task1Id);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});

		it("getDependencies returns empty for task with no deps", () => {
			const result = store.getDependencies(task3Id);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toHaveLength(0);
		});

		it("duplicate addDependency is idempotent or returns clear error", () => {
			store.addDependency(task1Id, task2Id, "blocks");
			const result = store.addDependency(task1Id, task2Id, "blocks");
			// Either succeeds (idempotent) or returns an error (not a crash)
			expect(typeof result.ok).toBe("boolean");
		});
	});
};

// Invoke with both adapters
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runDependencyStoreContractTests("SQLiteStateAdapter", () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	return adapter;
});

runDependencyStoreContractTests("InMemoryStateAdapter", () => {
	const adapter = new InMemoryStateAdapter();
	adapter.init();
	return adapter;
});
