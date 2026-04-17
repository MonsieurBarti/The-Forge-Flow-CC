import { describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

describe("SQLiteStateAdapter — UUID and branch support", () => {
	it("createMilestone should generate UUID id and compute branch", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();

		adapter.saveProject({ name: "Test" });
		const result = adapter.createMilestone({ number: 1, name: "Milestone 1" });

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const ms = result.data;
			// ID should be a UUID
			expect(ms.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			// Branch should be milestone/<8-char-prefix>
			expect(ms.branch).toMatch(/^milestone\/[0-9a-f]{8}$/);
			// Branch prefix should match first 8 chars of id
			expect(ms.branch).toBe(`milestone/${ms.id.slice(0, 8)}`);
		}
	});

	it("createSlice should generate UUID id", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();

		adapter.saveProject({ name: "Test" });
		const msResult = adapter.createMilestone({ number: 1, name: "Milestone 1" });
		expect(isOk(msResult)).toBe(true);
		const ms = msResult.data;

		const result = adapter.createSlice({ milestoneId: ms.id, number: 1, title: "Slice 1" });

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const slice = result.data;
			// ID should be a UUID
			expect(slice.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		}
	});

	it("getMilestone should return milestone with branch", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();

		adapter.saveProject({ name: "Test" });
		const createResult = adapter.createMilestone({ number: 1, name: "Milestone 1" });
		expect(isOk(createResult)).toBe(true);
		const created = createResult.data;

		const result = adapter.getMilestone(created.id);
		expect(isOk(result)).toBe(true);
		if (isOk(result) && result.data) {
			expect(result.data.branch).toBe(created.branch);
		}
	});

	it("getSlice should find slice by UUID id", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();

		adapter.saveProject({ name: "Test" });
		const msResult = adapter.createMilestone({ number: 1, name: "Milestone 1" });
		expect(isOk(msResult)).toBe(true);
		const ms = msResult.data;

		const createResult = adapter.createSlice({ milestoneId: ms.id, number: 1, title: "Slice 1" });
		expect(isOk(createResult)).toBe(true);
		const created = createResult.data;

		const result = adapter.getSlice(created.id);
		expect(isOk(result)).toBe(true);
		if (isOk(result) && result.data) {
			expect(result.data.id).toBe(created.id);
		}
	});
});
