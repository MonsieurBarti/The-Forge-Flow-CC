import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { isErr } from "../../src/domain/result.js";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

// Integration tests access the private `db` field for direct SQL operations.
type AdapterWithDb = { db: Database.Database };
const getDb = (adapter: SQLiteStateAdapter): Database.Database =>
	(adapter as unknown as AdapterWithDb).db;

describe("SQLite integration", () => {
	let adapter: SQLiteStateAdapter;

	beforeEach(() => {
		adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
	});

	it("FK: task with invalid slice_id fails", () => {
		adapter.saveProject({ name: "P" });
		adapter.createMilestone({ number: 1, name: "M" });
		const result = adapter.createTask({ sliceId: "nonexistent", number: 1, title: "T" });
		expect(isErr(result)).toBe(true);
	});

	it("FK: cannot delete milestone with slices", () => {
		adapter.saveProject({ name: "P" });
		adapter.createMilestone({ number: 1, name: "M" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S" });
		const db = getDb(adapter);
		expect(() => {
			db.prepare("DELETE FROM milestone WHERE id = 'M01'").run();
		}).toThrow();
	});

	it("CASCADE: deleting task removes dependency edges", () => {
		adapter.saveProject({ name: "P" });
		adapter.createMilestone({ number: 1, name: "M" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "T1" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "T2" });
		adapter.addDependency("M01-S01-T01", "M01-S01-T02", "blocks");

		const db = getDb(adapter);
		db.prepare("DELETE FROM task WHERE id = 'M01-S01-T01'").run();
		const deps = db.prepare("SELECT * FROM dependency").all();
		expect(deps).toHaveLength(0);
	});

	it("singleton: second project insert fails at DB level", () => {
		adapter.saveProject({ name: "P1" });
		const db = getDb(adapter);
		expect(() => {
			db.prepare("INSERT INTO project (id, name) VALUES ('other', 'P2')").run();
		}).toThrow();
	});

	it("migration: v1 creates all tables", () => {
		const db = getDb(adapter);
		const tables = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all() as {
			name: string;
		}[];
		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain("project");
		expect(tableNames).toContain("milestone");
		expect(tableNames).toContain("slice");
		expect(tableNames).toContain("task");
		expect(tableNames).toContain("dependency");
		expect(tableNames).toContain("workflow_session");
		expect(tableNames).toContain("schema_version");
	});

	it("init() returns VERSION_MISMATCH when db schema is ahead of code", () => {
		const db = getDb(adapter);
		db.prepare("DELETE FROM schema_version").run();
		db.prepare("INSERT INTO schema_version (version) VALUES (999)").run();
		const adapterWithFutureSchema = new (
			SQLiteStateAdapter as unknown as new (
				db: Database.Database,
			) => SQLiteStateAdapter
		)(db);
		const result = adapterWithFutureSchema.init();
		expect(isErr(result)).toBe(true);
		if (isErr(result)) expect(result.error.code).toBe("VERSION_MISMATCH");
	});

	it("closeMilestone with open slices returns HAS_OPEN_CHILDREN", () => {
		adapter.saveProject({ name: "P" });
		adapter.createMilestone({ number: 1, name: "M" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S" });
		const result = adapter.closeMilestone("M01");
		expect(isErr(result)).toBe(true);
		if (isErr(result)) expect(result.error.code).toBe("HAS_OPEN_CHILDREN");
	});
});
