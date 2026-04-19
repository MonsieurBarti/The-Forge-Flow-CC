import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let repo: string;
const CLI = join(process.cwd(), "dist/cli/index.js");

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-orphan-"));
	execFileSync("git", ["init", "-b", "feature/x"], { cwd: repo });
	execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
	execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
	execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
	mkdirSync(join(repo, ".tff-cc"), { recursive: true });
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("CLI startup runs orphan recovery", () => {
	it("cleans up stale *.tmp files in .tff-cc before dispatching", () => {
		const stale = join(repo, ".tff-cc", "STATE.md.tmp");
		writeFileSync(stale, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(stale, old, old);

		// Run a read-only CLI command; recovery should still sweep first.
		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		expect(existsSync(stale)).toBe(false);
	});

	it("cleans up stale *.tmp files in .tff-cc subdirectories before dispatching", () => {
		const subDir = join(repo, ".tff-cc", "milestones", "M01", "slices", "M01-S01");
		mkdirSync(subDir, { recursive: true });
		const stale = join(subDir, "PLAN.md.tmp");
		writeFileSync(stale, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(stale, old, old);

		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		expect(existsSync(stale)).toBe(false);
	});

	it("preserves fresh *.tmp files", () => {
		const fresh = join(repo, ".tff-cc", "STATE.md.tmp");
		writeFileSync(fresh, "fresh");
		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		expect(existsSync(fresh)).toBe(true);
	});
});
