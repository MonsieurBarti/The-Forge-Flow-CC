import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("slice-close completeness invariant", () => {
	let stores: ClosableStateStores;
	let sliceId: string;

	const driveToCompleting = (id: string): void => {
		const path = [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const;
		for (const target of path) {
			const r = stores.sliceStore.transitionSlice(id, target);
			expect(r.ok, `transition to ${target}: ${JSON.stringify(r)}`).toBe(true);
		}
	};

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

		// Claim task with executor "exec-A" — distinct from reviewers "rev-code" / "rev-sec"
		// so the D-3 fresh-reviewer invariant does not fire.
		const claimResult = stores.taskStore.claimTask(taskId, "exec-A");
		if (!claimResult.ok) throw new Error("Failed to claim task");

		// Drive the primary slice to `completing` so tests can attempt `closed`.
		driveToCompleting(sliceId);
	});

	afterEach(() => stores.close());

	const recordApproved = (type: "code" | "security" | "spec", reviewer: string) =>
		stores.reviewStore.recordReview({
			sliceId,
			reviewer,
			type,
			verdict: "approved",
			commitSha: "abc",
			createdAt: new Date().toISOString(),
		});

	it("rejects close when 0 reviews present", () => {
		const r = stores.sliceStore.transitionSlice(sliceId, "closed");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.error.code).toBe("SHIP_COMPLETENESS_VIOLATION");
			expect(r.error.context).toMatchObject({
				sliceId,
				missingTypes: ["code", "security"],
			});
		}
	});

	it("rejects close when only code review present", () => {
		expect(recordApproved("code", "rev-code").ok).toBe(true);
		const r = stores.sliceStore.transitionSlice(sliceId, "closed");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.error.code).toBe("SHIP_COMPLETENESS_VIOLATION");
			expect(r.error.context).toMatchObject({ missingTypes: ["security"] });
		}
	});

	it("accepts close when both code + security approvals present", () => {
		expect(recordApproved("code", "rev-code").ok).toBe(true);
		expect(recordApproved("security", "rev-sec").ok).toBe(true);
		const r = stores.sliceStore.transitionSlice(sliceId, "closed");
		expect(r.ok).toBe(true);
	});

	it("does not fire on non-terminal transitions", () => {
		// Create a second fresh slice (starts in `discussing`).
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

		// Transition to `researching` — no reviews at all; gate must not fire.
		const r = stores.sliceStore.transitionSlice(slice2Id, "researching");
		expect(r.ok).toBe(true);
	});
});
