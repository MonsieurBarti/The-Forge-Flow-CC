/**
 * T11 Test: Verify state-branch commands removed from cli/index.ts
 *
 * This test verifies that state-branch commands are removed from registry.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these imports/entries EXIST
 * 2. Remove the code → test should pass
 * 3. Commit
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("T11: cli/index.ts state-branch command removal", () => {
	const projectRoot = process.cwd();
	const filePath = join(projectRoot, "src/cli/index.ts");

	const IMPORTS_TO_REMOVE = [
		"branchMergeCmd",
		"restoreBranchCmd",
		"syncBranchCmd",
		"stateRepairCmd",
		"stateRepairBranchesCmd",
		"hookPostCheckoutCmd",
	];

	const COMMANDS_TO_REMOVE = [
		"sync:branch",
		"state:repair",
		"state:repair-branches",
		"restore:branch",
		"branch:merge",
		"hook:post-checkout",
	];

	for (const imp of IMPORTS_TO_REMOVE) {
		it(`should NOT import ${imp}`, () => {
			const content = readFileSync(filePath, "utf-8");
			expect(content).not.toContain(imp);
		});
	}

	for (const cmd of COMMANDS_TO_REMOVE) {
		it(`should NOT have "${cmd}" command in registry`, () => {
			const content = readFileSync(filePath, "utf-8");
			expect(content).not.toContain(`"${cmd}"`);
		});
	}
});
