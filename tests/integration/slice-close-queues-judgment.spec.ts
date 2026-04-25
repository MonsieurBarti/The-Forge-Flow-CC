import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("slice transition to closed queues a pending judgment", () => {
	let stores: ClosableStateStores;
	let sliceId: string;

	beforeEach(() => {
		stores = createClosableStateStoresUnchecked(":memory:");
		stores.projectStore.saveProject({ name: "Test Project" });
		stores.milestoneStore.createMilestone({ number: 1, name: "Milestone One" });
		const ms = stores.milestoneStore.listMilestones();
		if (!ms.ok || ms.data.length === 0) throw new Error("No milestones seeded");
		const sliceR = stores.sliceStore.createSlice({
			milestoneId: ms.data[0].id,
			number: 1,
			title: "Slice One",
		});
		if (!sliceR.ok) throw new Error("Failed to create slice");
		sliceId = sliceR.data.id;

		const taskR = stores.taskStore.createTask({ sliceId, number: 1, title: "Task One" });
		if (!taskR.ok) throw new Error("Failed to create task");
		stores.taskStore.claimTask(taskR.data.id, "exec-A");

		for (const target of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			const r = stores.sliceStore.transitionSlice(sliceId, target);
			if (!r.ok) throw new Error(`transition to ${target} failed`);
		}

		const recordApproved = (type: "code" | "security" | "spec", reviewer: string) =>
			stores.reviewStore.recordReview({
				sliceId,
				reviewer,
				type,
				verdict: "approved",
				commitSha: "abc",
				createdAt: new Date().toISOString(),
			});
		recordApproved("code", "rev-code");
		recordApproved("security", "rev-sec");
	});

	afterEach(() => stores.close());

	it("inserts a pending_judgments row when transitioning to closed", () => {
		expect(stores.sliceStore.transitionSlice(sliceId, "closed").ok).toBe(true);
		const list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data).toHaveLength(1);
		expect(list.data[0].sliceId).toBe(sliceId);
	});

	it("does not insert when transition fails (rollback)", () => {
		// Drop reviews so close fails the completeness gate.
		stores = (() => {
			stores.close();
			const fresh = createClosableStateStoresUnchecked(":memory:");
			return fresh;
		})();
		// Reseed without reviews so close is rejected.
		stores.projectStore.saveProject({ name: "Test Project" });
		stores.milestoneStore.createMilestone({ number: 1, name: "Milestone One" });
		const ms = stores.milestoneStore.listMilestones();
		if (!ms.ok) throw new Error("listMilestones failed");
		const sliceR = stores.sliceStore.createSlice({
			milestoneId: ms.data[0].id,
			number: 1,
			title: "Slice One",
		});
		if (!sliceR.ok) throw new Error("createSlice failed");
		const sId = sliceR.data.id;
		const taskR = stores.taskStore.createTask({ sliceId: sId, number: 1, title: "Task One" });
		if (!taskR.ok) throw new Error("createTask failed");
		stores.taskStore.claimTask(taskR.data.id, "exec-A");
		for (const target of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			const r = stores.sliceStore.transitionSlice(sId, target);
			if (!r.ok) throw new Error(`transition to ${target} failed`);
		}

		const r = stores.sliceStore.transitionSlice(sId, "closed");
		expect(r.ok).toBe(false);
		const list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data).toHaveLength(0);
	});

	it("is idempotent: re-running close (no-op) does not create duplicates", () => {
		expect(stores.sliceStore.transitionSlice(sliceId, "closed").ok).toBe(true);
		// Already closed → second close attempt is rejected by domain rules.
		const second = stores.sliceStore.transitionSlice(sliceId, "closed");
		expect(second.ok).toBe(false);
		const list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data).toHaveLength(1);
	});
});
