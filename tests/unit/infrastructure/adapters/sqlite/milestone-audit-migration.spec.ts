import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "../../../../../src/infrastructure/adapters/sqlite/schema.js";

describe("milestone_audit table (v5)", () => {
	const makeDb = () => {
		const db = new Database(":memory:");
		runMigrations(db);
		// seed project to satisfy FK on milestone
		db.prepare(
			"INSERT INTO project (id, name, created_at, updated_at) VALUES ('singleton', 'Test Project', datetime('now'), datetime('now'))",
		).run();
		// seed a milestone to satisfy FK on milestone_audit
		db.prepare(
			"INSERT INTO milestone (id, project_id, number, name, status, branch, created_at, updated_at) VALUES (?, 'singleton', 1, 'M1', 'open', 'branch-m1', datetime('now'), datetime('now'))",
		).run("m-1");
		return db;
	};

	it("creates milestone_audit with the expected columns", () => {
		const db = makeDb();
		const cols = db.prepare("PRAGMA table_info(milestone_audit)").all() as { name: string }[];
		const names = cols.map((c) => c.name).sort();
		expect(names).toEqual(["audited_at", "milestone_id", "notes", "verdict"]);
		db.close();
	});

	it("enforces verdict CHECK constraint", () => {
		const db = makeDb();
		expect(() =>
			db
				.prepare("INSERT INTO milestone_audit(milestone_id, verdict, audited_at) VALUES (?, ?, ?)")
				.run("m-1", "bogus", new Date().toISOString()),
		).toThrow();
		db.close();
	});

	it("allows upsert replacing prior verdict", () => {
		const db = makeDb();
		const ins = db.prepare(
			`INSERT INTO milestone_audit(milestone_id, verdict, audited_at) VALUES (?, ?, ?)
       ON CONFLICT(milestone_id) DO UPDATE SET verdict = excluded.verdict, audited_at = excluded.audited_at`,
		);
		ins.run("m-1", "not_ready", "2026-04-19T09:00:00Z");
		ins.run("m-1", "ready", "2026-04-19T10:00:00Z");
		const row = db
			.prepare("SELECT verdict FROM milestone_audit WHERE milestone_id = ?")
			.get("m-1") as { verdict: string };
		expect(row.verdict).toBe("ready");
		db.close();
	});

	it("rejects insert with unknown milestone_id (FK)", () => {
		const db = makeDb();
		expect(() =>
			db
				.prepare("INSERT INTO milestone_audit(milestone_id, verdict, audited_at) VALUES (?, ?, ?)")
				.run("unknown-milestone", "ready", new Date().toISOString()),
		).toThrow();
		db.close();
	});
});
