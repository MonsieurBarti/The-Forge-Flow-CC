import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { createClosableStateStoresUnchecked } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("fresh-reviewer invariant is wired on recordReview", () => {
	let stores: ClosableStateStores;
	let sliceId: string;

	beforeEach(() => {
		stores = createClosableStateStoresUnchecked(":memory:");
		stores.projectStore.saveProject({ name: "Test Project" });
		stores.milestoneStore.createMilestone({ number: 1, name: "Milestone One" });

		const msResult = stores.milestoneStore.listMilestones();
		if (!msResult.ok || msResult.data.length === 0) throw new Error("No milestones seeded");
		const milestoneId = msResult.data[0].id;

		const sliceResult = stores.sliceStore.createSlice({
			milestoneId,
			number: 1,
			title: "Slice One",
		});
		if (!sliceResult.ok) throw new Error("Failed to create slice");
		sliceId = sliceResult.data.id;

		const taskResult = stores.taskStore.createTask({
			sliceId,
			number: 1,
			title: "Task One",
		});
		if (!taskResult.ok) throw new Error("Failed to create task");
		const taskId = taskResult.data.id;

		const claimResult = stores.taskStore.claimTask(taskId, "agent-A");
		if (!claimResult.ok) throw new Error("Failed to claim task");
	});

	afterEach(() => stores.close());

	it("recordReview invokes getExecutorsForSlice before insert", () => {
		// The monolithic SQLiteStateAdapter implements both ReviewStore and TaskStore.
		// All store properties on `stores` point at the same adapter instance,
		// so spying on stores.taskStore.getExecutorsForSlice observes the sibling call.
		const spy = vi.spyOn(stores.taskStore, "getExecutorsForSlice");

		// Use a reviewer that is NOT an executor so the insert actually happens
		// and we observe the getExecutorsForSlice call in the success path.
		const result = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "agent-B",
			verdict: "approved",
			type: "code",
			commitSha: "abc123",
			createdAt: new Date().toISOString(),
		});

		expect(result.ok).toBe(true);
		expect(spy).toHaveBeenCalledWith(sliceId);
		spy.mockRestore();
	});
});
