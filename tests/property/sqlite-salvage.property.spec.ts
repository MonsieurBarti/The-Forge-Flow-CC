import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import Database from "better-sqlite3";
import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isErr, isOk } from "../../src/domain/result.js";
import { SQLiteSalvage } from "../../src/infrastructure/adapters/sqlite/sqlite-salvage.js";

const SCHEMA_DDL = `
	CREATE TABLE project (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		vision TEXT,
		created_at TEXT NOT NULL
	);
	CREATE TABLE milestone (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		number INTEGER NOT NULL,
		name TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'open',
		branch TEXT,
		close_reason TEXT,
		created_at TEXT NOT NULL
	);
	CREATE TABLE slice (
		id TEXT PRIMARY KEY,
		milestone_id TEXT NOT NULL,
		number INTEGER NOT NULL,
		title TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'discussing',
		tier TEXT,
		created_at TEXT NOT NULL
	);
	CREATE TABLE task (
		id TEXT PRIMARY KEY,
		slice_id TEXT NOT NULL,
		number INTEGER NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		status TEXT NOT NULL DEFAULT 'open',
		wave INTEGER,
		claimed_at TEXT,
		claimed_by TEXT,
		closed_reason TEXT,
		created_at TEXT NOT NULL
	);
	CREATE TABLE dependency (
		from_id TEXT NOT NULL,
		to_id TEXT NOT NULL,
		type TEXT NOT NULL,
		PRIMARY KEY (from_id, to_id)
	);
	CREATE TABLE workflow_session (
		id INTEGER PRIMARY KEY,
		state TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
	CREATE TABLE review (
		id TEXT PRIMARY KEY,
		slice_id TEXT NOT NULL,
		kind TEXT NOT NULL,
		verdict TEXT NOT NULL,
		reviewer_id TEXT NOT NULL,
		summary TEXT,
		created_at TEXT NOT NULL
	);
`;

let tempDir: string;

beforeEach(() => {
	tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-salvage-prop-"));
});

afterEach(() => {
	try {
		fs.rmSync(tempDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
});

function mkDb(populate: (db: Database.Database) => void): string {
	const dbPath = path.join(tempDir, `db-${Math.random().toString(36).slice(2)}.db`);
	const db = new Database(dbPath);
	db.exec(SCHEMA_DDL);
	populate(db);
	db.close();
	return dbPath;
}

describe("SQLiteSalvage - property-based", () => {
	const malformedMilestoneRow = fc.record({
		id: fc.oneof(fc.string(), fc.constant(""), fc.constant(null)),
		project_id: fc.oneof(fc.string(), fc.constant(null)),
		number: fc.oneof(fc.integer(), fc.constant(Number.NaN), fc.string()),
		name: fc.oneof(fc.string(), fc.constant(""), fc.constant(null)),
		status: fc.oneof(
			fc.constantFrom("open", "closed", "abandoned"),
			fc.string(),
			fc.constant(null),
		),
		branch: fc.oneof(fc.string(), fc.constant(null)),
		close_reason: fc.oneof(fc.string(), fc.constant(null)),
		created_at: fc.oneof(fc.string(), fc.constant("not-a-date"), fc.constant(null)),
	});

	it("P1 — malformed milestone rows never crash salvage", () => {
		fc.assert(
			fc.property(fc.array(malformedMilestoneRow, { maxLength: 5 }), (rows) => {
				const dbPath = mkDb((db) => {
					const stmt = db.prepare(
						"INSERT INTO milestone (id, project_id, number, name, status, branch, close_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
					);
					for (const r of rows) {
						try {
							stmt.run(
								r.id ?? `m-${Math.random()}`,
								r.project_id ?? "singleton",
								typeof r.number === "number" && !Number.isNaN(r.number) ? r.number : 0,
								r.name ?? "n",
								r.status ?? "open",
								r.branch,
								r.close_reason,
								r.created_at ?? new Date().toISOString(),
							);
						} catch {
							// SQLite rejected the row (NOT NULL violation etc.). That's fine — we're
							// testing salvage's tolerance to whatever made it into the DB.
						}
					}
				});

				const result = SQLiteSalvage.salvage(dbPath);
				expect(isOk(result) || isErr(result)).toBe(true);
				if (isOk(result) && result.data.snapshot) {
					for (const m of result.data.snapshot.milestones) {
						expect(typeof m.id).toBe("string");
						expect(m.id.length).toBeGreaterThan(0);
						expect(typeof m.name).toBe("string");
						expect(m.name.length).toBeGreaterThan(0);
						expect(m.createdAt).toBeInstanceOf(Date);
						expect(Number.isNaN(m.createdAt.getTime())).toBe(false);
					}
				}
			}),
			{ numRuns: 200 },
		);
	});

	it("P2 — partial datasets never crash salvage", () => {
		const populationPlan = fc.record({
			hasProject: fc.boolean(),
			milestoneCount: fc.integer({ min: 0, max: 5 }),
			sliceCount: fc.integer({ min: 0, max: 5 }),
			taskCount: fc.integer({ min: 0, max: 5 }),
			orphanSlices: fc.boolean(),
			orphanTasks: fc.boolean(),
		});

		fc.assert(
			fc.property(populationPlan, (plan) => {
				const dbPath = mkDb((db) => {
					if (plan.hasProject) {
						db.prepare(
							"INSERT INTO project (id, name, vision, created_at) VALUES ('singleton', 'P', NULL, ?)",
						).run(new Date().toISOString());
					}
					const msInsert = db.prepare(
						"INSERT INTO milestone (id, project_id, number, name, status, branch, close_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
					);
					for (let i = 0; i < plan.milestoneCount; i++) {
						msInsert.run(
							`m-${i}`,
							"singleton",
							i + 1,
							`M${i}`,
							"open",
							null,
							null,
							new Date().toISOString(),
						);
					}
					const slInsert = db.prepare(
						"INSERT INTO slice (id, milestone_id, number, title, status, tier, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
					);
					for (let i = 0; i < plan.sliceCount; i++) {
						const msId = plan.orphanSlices
							? "missing-milestone"
							: `m-${i % Math.max(1, plan.milestoneCount)}`;
						slInsert.run(
							`s-${i}`,
							msId,
							i + 1,
							`S${i}`,
							"discussing",
							null,
							new Date().toISOString(),
						);
					}
					const tkInsert = db.prepare(
						"INSERT INTO task (id, slice_id, number, title, description, status, wave, claimed_at, claimed_by, closed_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					);
					for (let i = 0; i < plan.taskCount; i++) {
						const slId = plan.orphanTasks
							? "missing-slice"
							: `s-${i % Math.max(1, plan.sliceCount)}`;
						tkInsert.run(
							`t-${i}`,
							slId,
							i + 1,
							`T${i}`,
							null,
							"open",
							null,
							null,
							null,
							null,
							new Date().toISOString(),
						);
					}
				});

				const result = SQLiteSalvage.salvage(dbPath);
				expect(isOk(result) || isErr(result)).toBe(true);
				if (isOk(result) && result.data.snapshot) {
					expect(Array.isArray(result.data.snapshot.milestones)).toBe(true);
					expect(Array.isArray(result.data.snapshot.slices)).toBe(true);
					expect(Array.isArray(result.data.snapshot.tasks)).toBe(true);
					expect(Array.isArray(result.data.snapshot.dependencies)).toBe(true);
					expect(Array.isArray(result.data.snapshot.reviews)).toBe(true);
				}
			}),
			{ numRuns: 200 },
		);
	});

	it("P3 — corrupt JSON in workflow_session.state never crashes salvage", () => {
		const corruptJson = fc.oneof(
			fc.constant("{not-json"),
			fc.constant("null"),
			fc.constant("[]"),
			fc.constant('{"incomplete":'),
			fc.string(),
			fc.constant(""),
		);

		fc.assert(
			fc.property(corruptJson, (bogusState) => {
				const dbPath = mkDb((db) => {
					db.prepare("INSERT INTO workflow_session (id, state, updated_at) VALUES (1, ?, ?)").run(
						bogusState,
						new Date().toISOString(),
					);
				});

				const result = SQLiteSalvage.salvage(dbPath);
				expect(isOk(result) || isErr(result)).toBe(true);
				if (isOk(result) && result.data.snapshot) {
					const s = result.data.snapshot.workflowSession;
					if (s !== null) {
						expect(typeof s).toBe("object");
					}
				}
			}),
			{ numRuns: 200 },
		);
	});
});

describe("SQLiteSalvage - smoke", () => {
	it("truncated SQLite file produces Result.err or Ok-with-null, never a throw", () => {
		const dbPath = path.join(tempDir, "truncated.db");
		// Write a partial SQLite header — too short to be a valid database.
		fs.writeFileSync(dbPath, Buffer.from("SQLite format 3\0").subarray(0, 16));

		const result = SQLiteSalvage.salvage(dbPath);
		expect(isOk(result) || isErr(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.snapshot).toBeNull();
		}
	});

	it("nonexistent file produces Result.err, not a throw", () => {
		const dbPath = path.join(tempDir, "nonexistent.db");
		const result = SQLiteSalvage.salvage(dbPath);
		expect(isErr(result)).toBe(true);
	});
});
