import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceFreshReviewer } from "../../src/application/review/enforce-fresh-reviewer.js";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("fresh-reviewer defense in depth", () => {
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

	it("adapter invariant catches the violation even when app-layer preflight is imagined to have passed", () => {
		// Regardless of whether a preflight was ever called, the adapter
		// rejects when reviewer is in the slice's executor list.
		const result = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "agent-A",
			verdict: "approved",
			type: "code",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("FRESH_REVIEWER_VIOLATION");
	});

	it("app-layer preflight catches the violation even when adapter invariant is stubbed away", async () => {
		// Stub the adapter's recordReview to be a no-op (simulate the invariant removed).
		const spy = vi
			.spyOn(stores.reviewStore, "recordReview")
			.mockReturnValue({ ok: true, data: undefined });

		// The app-layer enforceFreshReviewer still rejects, independently.
		const preflight = await enforceFreshReviewer(
			{ sliceId, reviewerAgent: "agent-A" },
			{ taskStore: stores.taskStore, reviewStore: stores.reviewStore },
		);
		expect(preflight.ok).toBe(false);
		if (!preflight.ok) expect(preflight.error.code).toBe("FRESH_REVIEWER_VIOLATION");

		spy.mockRestore();
	});
});
