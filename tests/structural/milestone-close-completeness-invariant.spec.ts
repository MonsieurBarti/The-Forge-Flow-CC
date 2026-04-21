import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { createClosableStateStoresUnchecked } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("milestone-close completeness invariant is wired", () => {
	let stores: ClosableStateStores;
	let milestoneId: string;
	let sliceId: string;

	beforeEach(() => {
		stores = createClosableStateStoresUnchecked(":memory:");
		// Seed project + milestone + 1 slice + task claimed by "exec-A".
		// Seed 1 approved spec review so closeMilestone would be ALLOWED to pass
		// the new invariant — we want to observe the check happening on a successful path
		// (slice in `discussing` is fine; HAS_OPEN_CHILDREN will fire later but that's
		// after the invariant check we're measuring).
		stores.projectStore.saveProject({ name: "Test Project" });
		stores.milestoneStore.createMilestone({ number: 1, name: "Milestone One" });

		const msResult = stores.milestoneStore.listMilestones();
		if (!msResult.ok || msResult.data.length === 0) throw new Error("No milestones seeded");
		milestoneId = msResult.data[0].id;

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
		const claimResult = stores.taskStore.claimTask(taskResult.data.id, "exec-A");
		if (!claimResult.ok) throw new Error("Failed to claim task");

		// Seed approved spec review
		const reviewResult = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "plannotator-1",
			type: "spec",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		if (!reviewResult.ok) throw new Error("Failed to seed spec review");
	});

	afterEach(() => stores.close());

	it("closeMilestone calls listSlices and listReviews to check spec approvals", () => {
		const listSlicesSpy = vi.spyOn(stores.sliceStore, "listSlices");
		const listReviewsSpy = vi.spyOn(stores.reviewStore, "listReviews");
		stores.milestoneStore.closeMilestone(milestoneId);
		expect(listSlicesSpy).toHaveBeenCalled();
		expect(listReviewsSpy).toHaveBeenCalled();
		listSlicesSpy.mockRestore();
		listReviewsSpy.mockRestore();
	});

	it("closeMilestone rejects when a slice lacks an approved spec review", () => {
		// Create a fresh milestone with one slice and NO spec review seeded.
		stores.milestoneStore.createMilestone({ number: 2, name: "Milestone Two" });

		const msResult = stores.milestoneStore.listMilestones();
		if (!msResult.ok || msResult.data.length === 0) throw new Error("No milestones found");
		const newMilestone = msResult.data.find((m) => m.name === "Milestone Two");
		if (!newMilestone) throw new Error("Milestone Two not found");
		const newMilestoneId = newMilestone.id;

		const sliceResult = stores.sliceStore.createSlice({
			milestoneId: newMilestoneId,
			number: 1,
			title: "Slice Without Spec",
		});
		if (!sliceResult.ok) throw new Error("Failed to create slice for Milestone Two");
		const newSliceId = sliceResult.data.id;

		const taskResult = stores.taskStore.createTask({
			sliceId: newSliceId,
			number: 1,
			title: "Task One",
		});
		if (!taskResult.ok) throw new Error("Failed to create task");
		const claimResult = stores.taskStore.claimTask(taskResult.data.id, "exec-C");
		if (!claimResult.ok) throw new Error("Failed to claim task");

		// No spec review seeded — close should be rejected.
		const result = stores.milestoneStore.closeMilestone(newMilestoneId);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("MILESTONE_COMPLETENESS_VIOLATION");
	});
});
