import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

function seedDb(adapter: SQLiteStateAdapter) {
	adapter.init();
	adapter.saveProject({ name: "Test" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	adapter.createMilestone({ number: 2, name: "Milestone Two" });
}

describe("getMilestoneByNumber", () => {
	it("returns milestone for a valid number", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		seedDb(adapter);
		const result = adapter.getMilestoneByNumber(1);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).not.toBeNull();
			expect(result.data?.number).toBe(1);
			expect(result.data?.name).toBe("Milestone One");
		}
	});

	it("returns null for an unknown number", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		seedDb(adapter);
		const result = adapter.getMilestoneByNumber(99);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBeNull();
	});
});

describe("getSliceByNumbers", () => {
	it("returns slice for valid milestone+slice numbers", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		seedDb(adapter);
		const ms = adapter.listMilestones();
		if (!ms.ok || ms.data.length === 0) throw new Error("No milestones");
		const milestoneId = ms.data[0].id;
		adapter.createSlice({ milestoneId, number: 1, title: "Slice One" });
		const result = adapter.getSliceByNumbers(1, 1);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).not.toBeNull();
			expect(result.data?.number).toBe(1);
			expect(result.data?.title).toBe("Slice One");
		}
	});

	it("returns null for unknown slice number", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		seedDb(adapter);
		const result = adapter.getSliceByNumbers(1, 99);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBeNull();
	});

	it("ignores archived prior milestone+slice when label numbers collide (issue #162)", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		adapter.saveProject({ name: "Test" });
		// Prior milestone with number=1, then close+archive cascade.
		adapter.createMilestone({ number: 1, name: "Prior M01" });
		const priorList = adapter.listMilestones();
		if (!priorList.ok || priorList.data.length === 0) throw new Error("seed failed");
		const priorMs = priorList.data[0];
		const priorSlice = adapter.createSlice({
			milestoneId: priorMs.id,
			number: 1,
			title: "Prior slice",
		});
		if (!priorSlice.ok) throw new Error("seed failed");
		const priorSliceId = priorSlice.data.id;
		const cascade = adapter.archiveMilestoneCascade(priorMs.id);
		if (!cascade.ok) throw new Error("seed failed");
		// New milestone, also number=1 (collides because archived rows are excluded
		// from the auto-numbering count). New slice, also number=1.
		adapter.createMilestone({ number: 1, name: "Live M01" });
		const liveList = adapter.listMilestones();
		if (!liveList.ok) throw new Error("seed failed");
		const liveMs = liveList.data.find((m) => m.id !== priorMs.id);
		if (!liveMs) throw new Error("expected live milestone");
		const liveSlice = adapter.createSlice({
			milestoneId: liveMs.id,
			number: 1,
			title: "Live slice",
		});
		if (!liveSlice.ok) throw new Error("seed failed");

		const milestoneByNumber = adapter.getMilestoneByNumber(1);
		expect(milestoneByNumber.ok).toBe(true);
		if (milestoneByNumber.ok) expect(milestoneByNumber.data?.id).toBe(liveMs.id);

		const sliceByNumbers = adapter.getSliceByNumbers(1, 1);
		expect(sliceByNumbers.ok).toBe(true);
		if (sliceByNumbers.ok) {
			expect(sliceByNumbers.data?.id).toBe(liveSlice.data.id);
			expect(sliceByNumbers.data?.id).not.toBe(priorSliceId);
		}
	});
});
