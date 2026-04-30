import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { v1Migration } from "../../../../../src/infrastructure/adapters/sqlite/migrations/v1.js";
import {
	getCurrentVersion,
	runMigrations,
} from "../../../../../src/infrastructure/adapters/sqlite/schema.js";

describe("schema", () => {
	let db: Database.Database;
	beforeEach(() => {
		db = new Database(":memory:");
	});
	afterEach(() => {
		db.close();
	});

	it("runs migrations on fresh db", () => {
		runMigrations(db);
		expect(getCurrentVersion(db)).toBe(8);
	});

	it("is idempotent", () => {
		runMigrations(db);
		runMigrations(db);
		expect(getCurrentVersion(db)).toBe(8);
	});

	it("enables WAL mode", () => {
		// WAL mode requires a file-based DB (SQLite does not support WAL on :memory:)
		const dir = mkdtempSync(join(tmpdir(), "tff-schema-test-"));
		const fileDb = new Database(join(dir, "test.db"));
		try {
			runMigrations(fileDb);
			const mode = fileDb.pragma("journal_mode", { simple: true });
			expect(mode).toBe("wal");
		} finally {
			fileDb.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("enables foreign keys", () => {
		runMigrations(db);
		const fk = db.pragma("foreign_keys", { simple: true });
		expect(fk).toBe(1);
	});

	it("enforces project singleton constraint", () => {
		runMigrations(db);
		db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P1')").run();
		expect(() => {
			db.prepare("INSERT INTO project (id, name) VALUES ('other', 'P2')").run();
		}).toThrow();
	});

	it("rejects VERSION_MISMATCH when db version > code version", () => {
		runMigrations(db);
		db.prepare("DELETE FROM schema_version").run();
		db.prepare("INSERT INTO schema_version (version) VALUES (999)").run();
		// Run migrations on the same db — version check should fail
		expect(() => runMigrations(db)).toThrow(/VERSION_MISMATCH|upgrade tff-tools/i);
	});

	it("creates all expected tables", () => {
		runMigrations(db);
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
		expect(tableNames).toContain("slice_dependency");
		expect(tableNames).toContain("milestone_audit");
		expect(tableNames).toContain("pending_judgments");
		expect(tableNames).toContain("workflow_session");
		expect(tableNames).toContain("schema_version");
	});

	it("cascades dependency deletion when task deleted", () => {
		runMigrations(db);
		db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
		db.prepare(
			"INSERT INTO milestone (id, project_id, number, name, branch) VALUES ('M01', 'singleton', 1, 'M', 'milestone/test')",
		).run();
		db.prepare(
			"INSERT INTO slice (id, milestone_id, number, title) VALUES ('M01-S01', 'M01', 1, 'S')",
		).run();
		db.prepare(
			"INSERT INTO task (id, slice_id, number, title) VALUES ('t1', 'M01-S01', 1, 'T1')",
		).run();
		db.prepare(
			"INSERT INTO task (id, slice_id, number, title) VALUES ('t2', 'M01-S01', 2, 'T2')",
		).run();
		db.prepare("INSERT INTO dependency (from_id, to_id, type) VALUES ('t1', 't2', 'blocks')").run();

		db.prepare("DELETE FROM task WHERE id = 't1'").run();
		const deps = db.prepare("SELECT * FROM dependency").all();
		expect(deps).toHaveLength(0);
	});

	it("prevents deleting milestone with slices (FK constraint)", () => {
		runMigrations(db);
		db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
		db.prepare(
			"INSERT INTO milestone (id, project_id, number, name, branch) VALUES ('M01', 'singleton', 1, 'M', 'milestone/test')",
		).run();
		db.prepare(
			"INSERT INTO slice (id, milestone_id, number, title) VALUES ('M01-S01', 'M01', 1, 'S')",
		).run();

		expect(() => {
			db.prepare("DELETE FROM milestone WHERE id = 'M01'").run();
		}).toThrow();
	});

	it("allows null milestone_id on slice for kind quick/debug", () => {
		runMigrations(db);
		db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
		expect(() => {
			db.prepare(
				"INSERT INTO slice (id, milestone_id, kind, number, title) VALUES ('Q01', NULL, 'quick', 1, 'quick fix')",
			).run();
		}).not.toThrow();
		expect(() => {
			db.prepare(
				"INSERT INTO slice (id, milestone_id, kind, number, title) VALUES ('D01', NULL, 'debug', 1, 'debug it')",
			).run();
		}).not.toThrow();
	});

	it("rejects unknown kind values", () => {
		runMigrations(db);
		expect(() => {
			db.prepare(
				"INSERT INTO slice (id, milestone_id, kind, number, title) VALUES ('X01', NULL, 'foo', 1, 'bad')",
			).run();
		}).toThrow();
	});

	it("backfills existing slices with kind=milestone", () => {
		// Manually load v1 schema, insert a pre-v8 slice row, then run all migrations.
		db.exec(v1Migration);
		db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
		db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
		db.prepare(
			"INSERT INTO milestone (id, project_id, number, name) VALUES ('M01', 'singleton', 1, 'M')",
		).run();
		db.prepare(
			"INSERT INTO slice (id, milestone_id, number, title) VALUES ('s1', 'M01', 1, 't')",
		).run();

		runMigrations(db);

		const row = db.prepare("SELECT kind, milestone_id FROM slice WHERE id = 's1'").get() as {
			kind: string;
			milestone_id: string;
		};
		expect(row.kind).toBe("milestone");
		expect(row.milestone_id).toBe("M01");
	});
});
