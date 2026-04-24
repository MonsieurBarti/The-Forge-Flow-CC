import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let repo: string;
let home: string;
const CLI = join(process.cwd(), "dist/cli/index.js");

const projectId = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-orphan-"));
	home = mkdtempSync(join(tmpdir(), "tff-orphan-home-"));

	execFileSync("git", ["init", "-b", "feature/x"], { cwd: repo });
	execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
	execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
	execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });

	writeFileSync(join(repo, ".tff-project-id"), `${projectId}\n`);

	mkdirSync(join(home, projectId, "milestones"), { recursive: true });
});
afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
	rmSync(home, { recursive: true, force: true });
});

describe("CLI startup runs orphan recovery", () => {
	it("cleans up stale *.tmp files in .tff-cc before dispatching", () => {
		const stale = join(home, projectId, "STATE.md.tmp");
		writeFileSync(stale, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(stale, old, old);

		// Run a read-only CLI command; recovery should still sweep first.
		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			env: { ...process.env, TFF_CC_HOME: home },
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		expect(existsSync(stale)).toBe(false);
	});

	it("cleans up stale *.tmp files in .tff-cc subdirectories before dispatching", () => {
		const subDir = join(home, projectId, "milestones", "M01", "slices", "M01-S01");
		mkdirSync(subDir, { recursive: true });
		const stale = join(subDir, "PLAN.md.tmp");
		writeFileSync(stale, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(stale, old, old);

		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			env: { ...process.env, TFF_CC_HOME: home },
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		expect(existsSync(stale)).toBe(false);
	});

	it("preserves fresh *.tmp files", () => {
		const fresh = join(home, projectId, "STATE.md.tmp");
		writeFileSync(fresh, "fresh");
		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			env: { ...process.env, TFF_CC_HOME: home },
			timeout: 30_000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		expect(existsSync(fresh)).toBe(true);
	});
});
