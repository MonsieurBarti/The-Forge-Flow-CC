import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const HOOK = join(process.cwd(), "scripts/hooks/branch-guard.mjs");

const runHook = (cwd: string, env: Record<string, string> = {}) =>
	spawnSync("node", [HOOK], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });

describe("pre-commit branch-guard hook", () => {
	let repo: string;
	let home: string;

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), "bg-hook-repo-"));
		home = mkdtempSync(join(tmpdir(), "bg-hook-home-"));
	});

	afterEach(() => {
		rmSync(repo, { recursive: true, force: true });
		rmSync(home, { recursive: true, force: true });
	});

	it("exits 1 on milestone branch with open slices", () => {
		const pid = "00000000-1111-2222-3333-444444444444";
		const dbDir = join(home, pid);
		mkdirSync(dbDir, { recursive: true });
		const db = new Database(join(dbDir, "state.db"));
		db.exec(`
      CREATE TABLE slice (
        id TEXT PRIMARY KEY,
        milestone_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        status TEXT NOT NULL
      );
    `);
		const milestoneId = "00000000-aaaa-bbbb-cccc-dddddddddddd";
		db.prepare(
			"INSERT INTO slice (id, milestone_id, number, status) VALUES (?, ?, 1, 'executing')",
		).run("slice-1", milestoneId);
		db.close();

		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
		execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), pid, "utf8");

		const res = runHook(repo, { TFF_CC_HOME: home });
		expect(res.status).toBe(1);
		expect(res.stderr).toContain("BRANCH_GUARD_VIOLATION");
		expect(res.stderr).toContain("milestone/00000000");
	});

	it("exits 0 on non-milestone branch", () => {
		execFileSync("git", ["init", "-b", "main"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), "any-id", "utf8");
		const res = runHook(repo, { TFF_CC_HOME: home });
		expect(res.status).toBe(0);
	});

	it("exits 0 when TFF_ALLOW_MILESTONE_COMMIT=1", () => {
		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		writeFileSync(join(repo, ".tff-project-id"), "any-id", "utf8");
		const res = runHook(repo, { TFF_ALLOW_MILESTONE_COMMIT: "1", TFF_CC_HOME: home });
		expect(res.status).toBe(0);
	});

	it("exits 0 when .tff-project-id is absent", () => {
		execFileSync("git", ["init", "-b", "milestone/00000000"], { cwd: repo });
		const res = runHook(repo, { TFF_CC_HOME: home });
		expect(res.status).toBe(0);
	});
});
