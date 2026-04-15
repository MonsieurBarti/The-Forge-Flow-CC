/**
 * T04 Test: Verify state-branch CLI commands are deleted
 *
 * This test verifies that state-branch CLI commands do NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these files EXIST
 * 2. Delete the files → test should pass
 * 3. Commit
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

// All CLI command files that should be deleted in T04
const FILES_TO_DELETE = [
	"src/cli/commands/restore-branch.cmd.ts",
	"src/cli/commands/sync-branch.cmd.ts",
	"src/cli/commands/branch-merge.cmd.ts",
	"src/cli/commands/state-repair-branches.cmd.ts",
	"src/cli/commands/state-repair.cmd.ts",
	"src/cli/commands/hook-post-checkout.cmd.ts",
];

describe("T04: CLI commands state-branch deletion", () => {
	// Use process.cwd() which is the project root when running tests
	const projectRoot = process.cwd();

	for (const file of FILES_TO_DELETE) {
		it(`should NOT have ${file} after deletion`, () => {
			const fullPath = join(projectRoot, file);
			// This test FAILS if file exists, PASSES if file is deleted
			expect(existsSync(fullPath)).toBe(false);
		});
	}
});
