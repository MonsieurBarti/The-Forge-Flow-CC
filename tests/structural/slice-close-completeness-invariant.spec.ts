import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { createClosableStateStoresUnchecked } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("slice-close completeness invariant is wired", () => {
	let stores: ClosableStateStores;
	let sliceId: string;

	const driveToCompleting = (id: string) => {
		const path = [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const;
		for (const target of path) {
			stores.sliceStore.transitionSlice(id, target);
		}
	};

	beforeEach(() => {
		stores = createClosableStateStoresUnchecked(":memory:");

		// Seed: project → milestone → slice → task claimed by "exec-A" → drive to completing → seed approved code + security reviews.
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

		// Claim task with executor "exec-A" — distinct from reviewers "rev-code" / "rev-sec"
		// so the D-3 fresh-reviewer invariant does not fire.
		const claimResult = stores.taskStore.claimTask(taskId, "exec-A");
		if (!claimResult.ok) throw new Error("Failed to claim task");

		// Drive the primary slice to `completing` so close is a legal next transition.
		driveToCompleting(sliceId);

		// Seed both approved code + security reviews so close succeeds (so we observe the listReviews call).
		const codeReviewResult = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "rev-code",
			type: "code",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		if (!codeReviewResult.ok) throw new Error("Failed to record code review");

		const securityReviewResult = stores.reviewStore.recordReview({
			sliceId,
			reviewer: "rev-sec",
			type: "security",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});
		if (!securityReviewResult.ok) throw new Error("Failed to record security review");
	});

	afterEach(() => stores.close());

	it("transitionSlice(..., 'closed') calls listReviews(sliceId)", () => {
		const spy = vi.spyOn(stores.reviewStore, "listReviews");
		stores.sliceStore.transitionSlice(sliceId, "closed");
		expect(spy).toHaveBeenCalledWith(sliceId);
		spy.mockRestore();
	});

	it("transitionSlice to a non-terminal target does not call listReviews", () => {
		// Create a second slice in `discussing`; transition to `researching`.
		const msResult = stores.milestoneStore.listMilestones();
		if (!msResult.ok || msResult.data.length === 0) throw new Error("No milestones found");
		const milestoneId = msResult.data[0].id;

		const slice2Result = stores.sliceStore.createSlice({
			milestoneId,
			number: 2,
			title: "Slice Two",
		});
		if (!slice2Result.ok) throw new Error("Failed to create second slice");
		const slice2Id = slice2Result.data.id;

		// Spy BEFORE the transition call.
		const spy = vi.spyOn(stores.reviewStore, "listReviews");
		stores.sliceStore.transitionSlice(slice2Id, "researching");
		// Assert the spy was NOT called for this new slice id.
		expect(spy).not.toHaveBeenCalledWith(slice2Id);
		spy.mockRestore();
	});
});
