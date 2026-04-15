/**
 * T10 Test: Verify state-branch exports removed from application/index.ts
 *
 * This test verifies that state-branch use case exports are removed.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these exports EXIST
 * 2. Remove the exports → test should pass
 * 3. Commit
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("T10: application/index.ts state-branch export removal", () => {
	const projectRoot = process.cwd();
	const filePath = join(projectRoot, "src/application/index.ts");

	it("should NOT export createRootBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("createRootBranchUseCase");
	});

	it("should NOT export forkBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("forkBranchUseCase");
	});

	it("should NOT export mergeBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("mergeBranchUseCase");
	});

	it("should NOT export restoreBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("restoreBranchUseCase");
	});

	it("should NOT export syncBranchUseCase", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("syncBranchUseCase");
	});

	it("should NOT have any state-branch imports", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("state-branch");
	});
});
