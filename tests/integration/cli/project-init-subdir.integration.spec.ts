/**
 * Integration test: project:init isolation
 *
 * Two contracts under test:
 *
 * 1. When TFF_CC_HOME is set, project:init writes the `.tff-project-id` and
 *    `.tff-cc` symlink under TFF_CC_HOME exclusively. The surrounding worktree
 *    (and any sub-directory it was invoked from) MUST be untouched. This is
 *    issue #172 — tests that set TFF_CC_HOME=<tmp> were leaking the symlink
 *    and id-file into the dogfood worktree, breaking subsequent tff-tools
 *    walk-ups.
 *
 * 2. When TFF_CC_HOME is unset and `tff-cc project:init` is run from a
 *    sub-directory of a git repo, the meta files land at the repo TOPLEVEL,
 *    not at the sub-directory cwd.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("project:init isolation", () => {
	let tempDir: string;
	let repoRoot: string;
	let subDir: string;

	beforeEach(() => {
		const created = join(
			tmpdir(),
			`tff-subdir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(created, { recursive: true });
		// Resolve realpath for macOS /private/var normalization
		tempDir = realpathSync(created);
		repoRoot = join(tempDir, "repo");
		subDir = join(repoRoot, "apps", "api");
		mkdirSync(subDir, { recursive: true });

		execFileSync("git", ["init", repoRoot]);
		execFileSync("git", ["-C", repoRoot, "config", "user.email", "test@test.com"]);
		execFileSync("git", ["-C", repoRoot, "config", "user.name", "Test"]);
		// Create an initial commit so git rev-parse --show-toplevel is reliable
		execFileSync("git", ["-C", repoRoot, "commit", "--allow-empty", "-m", "init"]);
		// project:init is wrapped with withMutatingCommand which refuses to run on the default
		// branch. Check out a feature branch so the guard passes.
		execFileSync("git", ["-C", repoRoot, "checkout", "-b", "feat/subdir-test"]);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("writes state files exclusively under TFF_CC_HOME when set, leaving cwd untouched", () => {
		const cliEntry = join(process.cwd(), "dist", "cli", "index.js");
		const tffHome = join(tempDir, "tff-home");
		execFileSync(process.execPath, [cliEntry, "project:init", "--name", "isolation-test"], {
			cwd: subDir,
			env: { ...process.env, TFF_CC_HOME: tffHome },
			encoding: "utf-8",
		});

		// Files land under TFF_CC_HOME — the canonical store when overridden
		expect(existsSync(join(tffHome, ".tff-project-id"))).toBe(true);
		expect(existsSync(join(tffHome, ".tff-cc"))).toBe(true);

		// And NOWHERE else: not in the worktree, not in the cwd it was invoked from
		expect(existsSync(join(repoRoot, ".tff-project-id"))).toBe(false);
		expect(existsSync(join(repoRoot, ".tff-cc"))).toBe(false);
		expect(existsSync(join(subDir, ".tff-project-id"))).toBe(false);
		expect(existsSync(join(subDir, ".tff-cc"))).toBe(false);

		// Git hooks must not be installed into the surrounding repo when sandboxed
		expect(existsSync(join(repoRoot, ".git", "hooks", "post-checkout"))).toBe(false);
	});

	it("writes .tff-project-id at the repo toplevel when launched from a sub-directory (no TFF_CC_HOME)", () => {
		const cliEntry = join(process.cwd(), "dist", "cli", "index.js");
		// Drop TFF_CC_HOME and redirect HOME so the run still doesn't touch the
		// user's real ~/.tff-cc. With TFF_CC_HOME unset, the meta files belong
		// at the repo toplevel — that's the production contract this test guards.
		const env = { ...process.env, HOME: join(tempDir, "fake-home") };
		delete env.TFF_CC_HOME;
		execFileSync(process.execPath, [cliEntry, "project:init", "--name", "subdir-test"], {
			cwd: subDir,
			env,
			encoding: "utf-8",
		});

		// .tff-project-id must be at the repo root, not in the sub-directory
		expect(existsSync(join(repoRoot, ".tff-project-id"))).toBe(true);
		expect(existsSync(join(subDir, ".tff-project-id"))).toBe(false);

		// .tff-cc symlink must be at the repo root, not in the sub-directory
		expect(existsSync(join(repoRoot, ".tff-cc"))).toBe(true);
		expect(existsSync(join(subDir, ".tff-cc"))).toBe(false);
	});
});
