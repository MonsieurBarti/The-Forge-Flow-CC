import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { DependencyStore } from "../../../../src/domain/ports/dependency-store.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../../src/domain/ports/task-store.port.js";
import { isErr, isOk } from "../../../../src/domain/result.js";

type FullAdapter = TaskStore &
	SliceStore &
	MilestoneStore &
	ProjectStore &
	DependencyStore &
	DatabaseInit;

export const runTaskStoreContractTests = (name: string, createAdapter: () => FullAdapter) => {
	describe(`TaskStore contract [${name}]`, () => {
		let store: FullAdapter;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			store.saveProject({ name: "Test Project" });
			store.createMilestone({ number: 1, name: "M1" });
			store.createSlice({ milestoneId: "M01", number: 1, title: "S01" });
		});

		it("createTask returns task with id format {sliceId}-T{number}", () => {
			const result = store.createTask({ sliceId: "M01-S01", number: 1, title: "First Task" });
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.id).toBe("M01-S01-T01");
				expect(result.data.title).toBe("First Task");
				expect(result.data.sliceId).toBe("M01-S01");
				expect(result.data.number).toBe(1);
				expect(result.data.status).toBe("open");
			}
		});

		it("getTask returns null for unknown id", () => {
			const result = store.getTask("nonexistent");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toBeNull();
		});

		it("getTask returns saved task", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Task" });
			const result = store.getTask("M01-S01-T01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.title).toBe("Task");
			}
		});

		it("listTasks returns all tasks for a slice", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "T1" });
			store.createTask({ sliceId: "M01-S01", number: 2, title: "T2" });
			const result = store.listTasks("M01-S01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toHaveLength(2);
		});

		it("updateTask updates title and description", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Old" });
			store.updateTask("M01-S01-T01", { title: "New", description: "Updated desc" });
			const result = store.getTask("M01-S01-T01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data!.title).toBe("New");
				expect(result.data!.description).toBe("Updated desc");
			}
		});

		it("claimTask sets status=in_progress and claimedAt", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Task" });
			const claimResult = store.claimTask("M01-S01-T01");
			expect(isOk(claimResult)).toBe(true);
			const result = store.getTask("M01-S01-T01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data!.status).toBe("in_progress");
				expect(result.data!.claimedAt).toBeDefined();
			}
		});

		it("claimTask on non-open task returns ALREADY_CLAIMED", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Task" });
			store.claimTask("M01-S01-T01"); // claim once
			const result = store.claimTask("M01-S01-T01"); // claim again
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.code).toBe("ALREADY_CLAIMED");
			}
		});

		it("closeTask sets status=closed and reason", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Task" });
			store.claimTask("M01-S01-T01");
			store.closeTask("M01-S01-T01", "Done");
			const result = store.getTask("M01-S01-T01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data!.status).toBe("closed");
				expect(result.data!.closedReason).toBe("Done");
			}
		});

		it("listReadyTasks: returns open tasks with no unresolved deps", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Task A" });
			const result = store.listReadyTasks("M01-S01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0].id).toBe("M01-S01-T01");
			}
		});

		it("listReadyTasks: excludes tasks blocked by open deps", () => {
			// T01 blocks T02 (T02 depends on T01, T01 is still open)
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Blocker" });
			store.createTask({ sliceId: "M01-S01", number: 2, title: "Blocked" });
			// T02 depends on T01 — T01 blocks T02
			store.addDependency("M01-S01-T02", "M01-S01-T01", "blocks");
			const result = store.listReadyTasks("M01-S01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const ids = result.data.map((t) => t.id);
				expect(ids).toContain("M01-S01-T01");
				expect(ids).not.toContain("M01-S01-T02");
			}
		});

		it("listReadyTasks: includes tasks whose deps are all closed", () => {
			// T01 blocks T02, but T01 is closed → T02 should be ready
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Done Task" });
			store.createTask({ sliceId: "M01-S01", number: 2, title: "Now Ready" });
			store.addDependency("M01-S01-T02", "M01-S01-T01", "blocks");
			// Close T01
			store.claimTask("M01-S01-T01");
			store.closeTask("M01-S01-T01", "done");
			const result = store.listReadyTasks("M01-S01");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const ids = result.data.map((t) => t.id);
				// T01 is closed so not in open tasks, T02 should appear since its dep is closed
				expect(ids).toContain("M01-S01-T02");
			}
		});

		it("listStaleClaims: returns tasks claimed before TTL cutoff", () => {
			store.createTask({ sliceId: "M01-S01", number: 1, title: "Stale Task" });
			store.claimTask("M01-S01-T01");
			// With a very large TTL (999999 minutes), nothing should be stale
			const noStale = store.listStaleClaims(999999);
			expect(isOk(noStale)).toBe(true);
			if (isOk(noStale)) expect(noStale.data).toHaveLength(0);
			// With a negative TTL (future cutoff), everything is stale
			// TTL=-60 means cutoff = now + 60 minutes → all in-progress tasks qualify
			const allStale = store.listStaleClaims(-60);
			expect(isOk(allStale)).toBe(true);
			if (isOk(allStale)) {
				expect(allStale.data.length).toBeGreaterThanOrEqual(1);
				const ids = allStale.data.map((t) => t.id);
				expect(ids).toContain("M01-S01-T01");
			}
		});
	});
};

import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runTaskStoreContractTests("SQLiteStateAdapter", () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	return adapter;
});

runTaskStoreContractTests("InMemoryStateAdapter", () => {
	const adapter = new InMemoryStateAdapter();
	adapter.init();
	return adapter;
});
