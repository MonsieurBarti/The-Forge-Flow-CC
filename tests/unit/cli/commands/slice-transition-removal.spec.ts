/**
 * T09 Test: Verify state branch sync removed from slice-transition.cmd.ts
 *
 * This test verifies that state branch sync logic is removed.
 *
 * TDD Cycle:
 * 1. Write failing test → currently sync logic exists
 * 2. Remove the code → test should pass
 * 3. Commit
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("T09: slice-transition.cmd.ts state branch sync removal", () => {
	const projectRoot = process.cwd();
	const filePath = join(projectRoot, "src/cli/commands/slice-transition.cmd.ts");

	it("should NOT import syncBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("syncBranchUseCase");
	});

	it("should NOT import GitStateBranchAdapter", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("GitStateBranchAdapter");
	});

	it("should NOT import withBranchGuard", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("withBranchGuard");
	});

	it("should NOT reference stateBranchAdapter", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("stateBranchAdapter");
	});

	it("should NOT reference state branch sync", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("state branch sync");
	});
});
