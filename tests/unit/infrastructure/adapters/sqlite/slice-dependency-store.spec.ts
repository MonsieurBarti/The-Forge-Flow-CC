import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

function makeDb() {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	const db = (adapter as unknown as { db: import("better-sqlite3").Database }).db;
	db.prepare(
		"INSERT INTO project (id, name, created_at, updated_at) VALUES ('singleton', 'Test', datetime('now'), datetime('now'))",
	).run();
	db.prepare(
		"INSERT INTO milestone (id, project_id, number, name, status, branch, created_at, updated_at) VALUES ('m1', 'singleton', 1, 'M1', 'open', 'branch-1', datetime('now'), datetime('now'))",
	).run();
	return adapter;
}

function makeSlice(adapter: SQLiteStateAdapter, id: string, number: number) {
	adapter.createSlice({ id, milestoneId: "m1", number, title: `Slice ${number}` });
}

describe("SliceDependencyStore", () => {
	it("adds a slice dependency", () => {
		const adapter = makeDb();
		makeSlice(adapter, "s1", 1);
		makeSlice(adapter, "s2", 2);
		const result = adapter.addSliceDependency("s2", "s1");
		expect(result.ok).toBe(true);
	});

	it("lists dependencies for a slice", () => {
		const adapter = makeDb();
		makeSlice(adapter, "s1", 1);
		makeSlice(adapter, "s2", 2);
		adapter.addSliceDependency("s2", "s1");
		const result = adapter.getSliceDependencies("s2");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({ fromId: "s2", toId: "s1" });
		}
	});

	it("removes a slice dependency", () => {
		const adapter = makeDb();
		makeSlice(adapter, "s1", 1);
		makeSlice(adapter, "s2", 2);
		adapter.addSliceDependency("s2", "s1");
		adapter.removeSliceDependency("s2", "s1");
		const result = adapter.getSliceDependencies("s2");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toHaveLength(0);
	});

	it("is idempotent on add (insert or replace)", () => {
		const adapter = makeDb();
		makeSlice(adapter, "s1", 1);
		makeSlice(adapter, "s2", 2);
		adapter.addSliceDependency("s2", "s1");
		const result = adapter.addSliceDependency("s2", "s1");
		expect(result.ok).toBe(true);
	});
});
