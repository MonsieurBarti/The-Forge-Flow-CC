import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("recordReview fresh-reviewer invariant", () => {
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

	it("rejects when reviewer is in the slice's executor list", () => {
		const result = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "agent-A",
			verdict: "approved",
			type: "code",
			commitSha: "abc123",
			createdAt: new Date().toISOString(),
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("FRESH_REVIEWER_VIOLATION");
	});

	it("accepts when reviewer is not in the slice's executor list", () => {
		const result = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "agent-B",
			verdict: "approved",
			type: "code",
			commitSha: "abc123",
			createdAt: new Date().toISOString(),
		});
		expect(result.ok).toBe(true);
	});
});
