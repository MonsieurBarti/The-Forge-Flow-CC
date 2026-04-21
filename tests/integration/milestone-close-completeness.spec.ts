import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { createClosableStateStoresUnchecked } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("milestone-close completeness invariant", () => {
	let stores: ClosableStateStores;
	let milestoneId: string;
	let sliceIds: string[];

	beforeEach(() => {
		stores = createClosableStateStoresUnchecked(":memory:");

		stores.projectStore.saveProject({ name: "Test Project" });
		stores.milestoneStore.createMilestone({ number: 1, name: "Milestone One" });

		const msResult = stores.milestoneStore.listMilestones();
		if (!msResult.ok || msResult.data.length === 0) throw new Error("No milestones seeded");
		milestoneId = msResult.data[0].id;

		sliceIds = [];

		const slice1Result = stores.sliceStore.createSlice({
			milestoneId,
			number: 1,
			title: "Slice One",
		});
		if (!slice1Result.ok) throw new Error("Failed to create slice 1");
		sliceIds.push(slice1Result.data.id);

		const task1Result = stores.taskStore.createTask({
			sliceId: sliceIds[0],
			number: 1,
			title: "Task One",
		});
		if (!task1Result.ok) throw new Error("Failed to create task 1");
		const claim1Result = stores.taskStore.claimTask(task1Result.data.id, "exec-A");
		if (!claim1Result.ok) throw new Error("Failed to claim task 1");

		const slice2Result = stores.sliceStore.createSlice({
			milestoneId,
			number: 2,
			title: "Slice Two",
		});
		if (!slice2Result.ok) throw new Error("Failed to create slice 2");
		sliceIds.push(slice2Result.data.id);

		const task2Result = stores.taskStore.createTask({
			sliceId: sliceIds[1],
			number: 1,
			title: "Task Two",
		});
		if (!task2Result.ok) throw new Error("Failed to create task 2");
		const claim2Result = stores.taskStore.claimTask(task2Result.data.id, "exec-A");
		if (!claim2Result.ok) throw new Error("Failed to claim task 2");
	});

	afterEach(() => stores.close());

	const seedSpecApproval = (sliceId: string, reviewer: string) =>
		stores.reviewStore.recordReview({
			sliceId,
			reviewer,
			type: "spec",
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});

	it("rejects close when no slices have spec approval", () => {
		const r = stores.milestoneStore.closeMilestone(milestoneId);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.error.code).toBe("MILESTONE_COMPLETENESS_VIOLATION");
			expect(r.error.context).toMatchObject({
				milestoneId,
				slicesMissingSpecApproval: sliceIds,
			});
		}
	});

	it("rejects close when one of two slices lacks spec approval", () => {
		expect(seedSpecApproval(sliceIds[0], "plannotator-1").ok).toBe(true);
		const r = stores.milestoneStore.closeMilestone(milestoneId);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.error.context).toMatchObject({
				slicesMissingSpecApproval: [sliceIds[1]],
			});
		}
	});

	it("accepts close when all slices have approved spec reviews", () => {
		expect(seedSpecApproval(sliceIds[0], "plannotator-1").ok).toBe(true);
		expect(seedSpecApproval(sliceIds[1], "plannotator-2").ok).toBe(true);

		// Close each slice: transition through the full state chain and seed required reviews
		for (const sliceId of sliceIds) {
			for (const state of [
				"researching",
				"planning",
				"executing",
				"verifying",
				"reviewing",
				"completing",
			] as const) {
				expect(stores.sliceStore.transitionSlice(sliceId, state).ok).toBe(true);
			}
			expect(
				stores.reviewStore.recordReview({
					sliceId,
					reviewer: "reviewer-code",
					type: "code",
					verdict: "approved",
					commitSha: "abc",
					createdAt: new Date().toISOString(),
				}).ok,
			).toBe(true);
			expect(
				stores.reviewStore.recordReview({
					sliceId,
					reviewer: "reviewer-sec",
					type: "security",
					verdict: "approved",
					commitSha: "abc",
					createdAt: new Date().toISOString(),
				}).ok,
			).toBe(true);
			expect(stores.sliceStore.transitionSlice(sliceId, "closed").ok).toBe(true);
		}

		const r = stores.milestoneStore.closeMilestone(milestoneId);
		expect(r.ok).toBe(true);
	});
});
