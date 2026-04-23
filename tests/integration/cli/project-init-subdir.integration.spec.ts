/**
 * Integration test: project:init from a sub-directory
 *
 * Verifies that running `tff-cc project:init` from a sub-directory of a git
 * repo writes `.tff-project-id` and creates the `.tff-cc` symlink at the repo
 * TOPLEVEL — not in the sub-directory where the CLI was invoked.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("project:init from a sub-directory", () => {
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

	it("writes .tff-project-id at the repo toplevel when launched from a sub-directory", () => {
		const cliEntry = join(process.cwd(), "dist", "cli", "index.js");
		execFileSync(
			process.execPath,
			[cliEntry, "project:init", "--name", "subdir-test"],
			{
				cwd: subDir,
				env: { ...process.env, TFF_CC_HOME: join(tempDir, "tff-home") },
				encoding: "utf-8",
			},
		);

		// .tff-project-id must be at the repo root, not in the sub-directory
		expect(existsSync(join(repoRoot, ".tff-project-id"))).toBe(true);
		expect(existsSync(join(subDir, ".tff-project-id"))).toBe(false);

		// .tff-cc symlink must be at the repo root, not in the sub-directory
		expect(existsSync(join(repoRoot, ".tff-cc"))).toBe(true);
		expect(existsSync(join(subDir, ".tff-cc"))).toBe(false);
	});
});
