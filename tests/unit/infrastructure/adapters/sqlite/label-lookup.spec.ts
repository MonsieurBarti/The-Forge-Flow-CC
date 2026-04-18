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
});
