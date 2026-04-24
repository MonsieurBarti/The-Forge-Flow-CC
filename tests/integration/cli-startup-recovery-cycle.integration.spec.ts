import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let repo: string;
let home: string;
const CLI = join(process.cwd(), "dist/cli/index.js");
const PROJECT_ID = "5580e1f9-2c81-423c-a041-5e8d4089e1fb";

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-cycle-repo-"));
	home = mkdtempSync(join(tmpdir(), "tff-cycle-home-"));

	execFileSync("git", ["init", "-b", "main"], { cwd: repo });
	execFileSync("git", ["config", "user.email", "t@t"], { cwd: repo });
	execFileSync("git", ["config", "user.name", "t"], { cwd: repo });
	execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });

	writeFileSync(join(repo, ".tff-project-id"), `${PROJECT_ID}\n`);

	const projectHome = join(home, PROJECT_ID);
	mkdirSync(join(projectHome, "milestones"), { recursive: true });
	mkdirSync(join(projectHome, "worktrees", "M01-S01"), { recursive: true });
	symlinkSync(projectHome, join(projectHome, "worktrees", "M01-S01", ".tff-cc"));
	symlinkSync(projectHome, join(repo, ".tff-cc"));

	const stale = join(projectHome, "milestones", "STATE.md.tmp");
	writeFileSync(stale, "stale");
	const old = Math.floor(Date.now() / 1000) - 600;
	utimesSync(stale, old, old);
});
afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
	rmSync(home, { recursive: true, force: true });
});

describe("CLI startup against a cyclic project home", () => {
	it("completes recovery in bounded time and sweeps the stale tmp", () => {
		const start = Date.now();
		execFileSync("node", [CLI, "schema", "--command", "slice:list"], {
			cwd: repo,
			env: { ...process.env, TFF_CC_HOME: home },
			timeout: 10_000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(10_000);

		const stale = join(home, PROJECT_ID, "milestones", "STATE.md.tmp");
		expect(existsSync(stale)).toBe(false);
	});
});
