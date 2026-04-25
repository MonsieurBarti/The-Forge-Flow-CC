/**
 * T01 Test: V3 Schema Migration
 *
 * This test verifies the v3 migration adds a `branch` column to milestone table.
 *
 * TDD Cycle:
 * 1. Write failing test → v3 migration doesn't exist yet
 * 2. Implement the module → test should pass
 * 3. Commit
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getCurrentVersion,
	runMigrations,
} from "../../../src/infrastructure/adapters/sqlite/schema.js";

describe("T01: V3 Schema Migration", () => {
	let tempDir: string;
	let dbPath: string;
	let db: Database.Database;

	beforeEach(() => {
		tempDir = mkdirSync(join(tmpdir(), `tff-v3-test-${Date.now()}`), { recursive: true });
		dbPath = join(tempDir, "state.db");
		db = new Database(dbPath);
	});

	afterEach(() => {
		db.close();
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("should run all migrations and reach current schema version", () => {
		runMigrations(db);
		expect(getCurrentVersion(db)).toBe(7);
	});

	it("should add branch column to milestone table", () => {
		runMigrations(db);

		// Verify branch column exists by inserting a project and milestone
		db.prepare(
			`INSERT INTO project (id, name, created_at, updated_at) VALUES ('singleton', 'Test', datetime('now'), datetime('now'))`,
		).run();

		const stmt = db.prepare(`
			INSERT INTO milestone (id, project_id, number, name, status, branch, created_at, updated_at)
			VALUES (?, 'singleton', ?, ?, 'open', ?, datetime('now'), datetime('now'))
		`);
		expect(() => stmt.run("M01", 1, "Test", "milestone/a1b2c3d4")).not.toThrow();

		// Verify the branch was stored
		const row = db.prepare("SELECT branch FROM milestone WHERE id = ?").get("M01") as
			| { branch: string }
			| undefined;
		expect(row?.branch).toBe("milestone/a1b2c3d4");
	});

	it("should set default empty string for existing milestones without branch", () => {
		// Create full v1 schema manually (simulating existing DB before migrations)
		db.exec(`
			PRAGMA foreign_keys = ON;
			CREATE TABLE IF NOT EXISTS schema_version (
				version INTEGER PRIMARY KEY,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE TABLE IF NOT EXISTS project (
				id TEXT PRIMARY KEY CHECK (id = 'singleton'),
				name TEXT NOT NULL,
				vision TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE TABLE IF NOT EXISTS milestone (
				id TEXT PRIMARY KEY,
				project_id TEXT NOT NULL REFERENCES project(id),
				number INTEGER NOT NULL,
				name TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'open',
				close_reason TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE TABLE IF NOT EXISTS slice (
				id TEXT PRIMARY KEY,
				milestone_id TEXT NOT NULL REFERENCES milestone(id),
				number INTEGER NOT NULL,
				title TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'discussing',
				tier TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE TABLE IF NOT EXISTS task (
				id TEXT PRIMARY KEY,
				slice_id TEXT NOT NULL REFERENCES slice(id),
				number INTEGER NOT NULL,
				title TEXT NOT NULL,
				description TEXT,
				status TEXT NOT NULL DEFAULT 'open',
				wave INTEGER,
				claimed_at TEXT,
				closed_reason TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			CREATE TABLE IF NOT EXISTS dependency (
				from_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
				to_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
				type TEXT NOT NULL DEFAULT 'blocks',
				PRIMARY KEY (from_id, to_id)
			);
			CREATE TABLE IF NOT EXISTS workflow_session (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				phase TEXT NOT NULL DEFAULT 'idle',
				active_slice_id TEXT REFERENCES slice(id),
				active_milestone_id TEXT REFERENCES milestone(id),
				paused_at TEXT,
				context_json TEXT,
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);
			INSERT INTO schema_version (version) VALUES (1);
		`);

		// Insert project and milestone without branch column
		db.prepare(
			`INSERT INTO project (id, name, created_at, updated_at) VALUES ('singleton', 'Legacy', datetime('now'), datetime('now'))`,
		).run();
		db.prepare(
			`INSERT INTO milestone (id, project_id, number, name, status, created_at, updated_at)
			 VALUES ('M01', 'singleton', 1, 'Legacy', 'open', datetime('now'), datetime('now'))`,
		).run();

		// Now run the remaining migrations (v2 and v3)
		runMigrations(db);

		// Verify the milestone now has an empty branch
		const row = db.prepare("SELECT branch FROM milestone WHERE id = ?").get("M01") as
			| { branch: string }
			| undefined;
		expect(row?.branch).toBe("");
	});
});
