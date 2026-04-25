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

	it("recordMerge populates merge_sha + base_ref and getPending exposes them", () => {
		const r = stores.pendingJudgmentStore.recordMerge(sliceId, "abc1234", "milestone/x");
		expect(r.ok).toBe(true);
		const got = stores.pendingJudgmentStore.getPending(sliceId);
		expect(got.ok).toBe(true);
		if (!got.ok || !got.data) throw new Error("expected pending record");
		expect(got.data.mergeSha).toBe("abc1234");
		expect(got.data.baseRef).toBe("milestone/x");
	});

	it("recordMerge upserts: subsequent calls overwrite merge_sha + base_ref", () => {
		stores.pendingJudgmentStore.recordMerge(sliceId, "old", "milestone/x");
		stores.pendingJudgmentStore.recordMerge(sliceId, "new", "main");
		const got = stores.pendingJudgmentStore.getPending(sliceId);
		if (!got.ok || !got.data) throw new Error("expected pending record");
		expect(got.data.mergeSha).toBe("new");
		expect(got.data.baseRef).toBe("main");
	});

	it("insertPending after recordMerge preserves merge fields (ON CONFLICT DO NOTHING)", () => {
		stores.pendingJudgmentStore.recordMerge(sliceId, "abc1234", "milestone/x");
		stores.pendingJudgmentStore.insertPending(sliceId);
		const got = stores.pendingJudgmentStore.getPending(sliceId);
		if (!got.ok || !got.data) throw new Error("expected pending record");
		expect(got.data.mergeSha).toBe("abc1234");
		expect(got.data.baseRef).toBe("milestone/x");
	});

	it("getPending returns null for absent rows", () => {
		const got = stores.pendingJudgmentStore.getPending(sliceId);
		expect(got.ok).toBe(true);
		if (!got.ok) return;
		expect(got.data).toBeNull();
	});

	it("listPending exposes merge fields when present, omits when absent", () => {
		stores.pendingJudgmentStore.insertPending(sliceId);
		let list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data[0].mergeSha).toBeUndefined();
		expect(list.data[0].baseRef).toBeUndefined();

		stores.pendingJudgmentStore.recordMerge(sliceId, "deadbeef", "milestone/x");
		list = stores.pendingJudgmentStore.listPending();
		if (!list.ok) throw new Error("listPending failed");
		expect(list.data[0].mergeSha).toBe("deadbeef");
		expect(list.data[0].baseRef).toBe("milestone/x");
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
