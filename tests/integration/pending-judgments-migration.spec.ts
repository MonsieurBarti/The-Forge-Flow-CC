import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClosableStateStores,
	createClosableStateStoresUnchecked,
} from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

describe("pending_judgments table (v6 migration)", () => {
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
	});

	afterEach(() => stores.close());

	it("insertPending creates a row and listPending returns it", () => {
		expect(stores.pendingJudgmentStore.insertPending(sliceId).ok).toBe(true);
		const list = stores.pendingJudgmentStore.listPending();
		expect(list.ok).toBe(true);
		if (!list.ok) return;
		expect(list.data).toHaveLength(1);
		expect(list.data[0].sliceId).toBe(sliceId);
	});

	it("insertPending is idempotent (no duplicate rows)", () => {
		expect(stores.pendingJudgmentStore.insertPending(sliceId).ok).toBe(true);
		expect(stores.pendingJudgmentStore.insertPending(sliceId).ok).toBe(true);
		const list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data).toHaveLength(1);
	});

	it("clearPending removes the row", () => {
		stores.pendingJudgmentStore.insertPending(sliceId);
		expect(stores.pendingJudgmentStore.clearPending(sliceId).ok).toBe(true);
		const list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data).toHaveLength(0);
	});

	it("clearPending is a no-op when row is absent", () => {
		const r = stores.pendingJudgmentStore.clearPending(sliceId);
		expect(r.ok).toBe(true);
	});

	it("listPendingForMilestone scopes results to that milestone", () => {
		stores.milestoneStore.createMilestone({ number: 2, name: "Milestone Two" });
		const ms = stores.milestoneStore.listMilestones();
		if (!ms.ok) throw new Error("listMilestones failed");
		const m1 = ms.data.find((m) => m.number === 1);
		const m2 = ms.data.find((m) => m.number === 2);
		if (!m1 || !m2) throw new Error("Could not find milestones");

		const slice2R = stores.sliceStore.createSlice({
			milestoneId: m2.id,
			number: 1,
			title: "Slice Two",
		});
		if (!slice2R.ok) throw new Error("Failed to create slice 2");

		stores.pendingJudgmentStore.insertPending(sliceId);
		stores.pendingJudgmentStore.insertPending(slice2R.data.id);

		const m1Pending = stores.pendingJudgmentStore.listPendingForMilestone(m1.id);
		const m2Pending = stores.pendingJudgmentStore.listPendingForMilestone(m2.id);
		if (!m1Pending.ok || !m2Pending.ok) throw new Error("listPendingForMilestone failed");

		expect(m1Pending.data.map((p) => p.sliceId)).toEqual([sliceId]);
		expect(m2Pending.data.map((p) => p.sliceId)).toEqual([slice2R.data.id]);
	});
});
