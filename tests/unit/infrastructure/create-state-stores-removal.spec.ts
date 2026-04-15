/**
 * T08 Test: Verify branch alignment removed from create-state-stores.ts
 *
 * This test verifies that branch alignment checks are removed.
 *
 * TDD Cycle:
 * 1. Write failing test → currently branch alignment code exists
 * 2. Remove the code → test should pass
 * 3. Commit
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("T08: create-state-stores.ts branch alignment removal", () => {
	const projectRoot = process.cwd();
	const filePath = join(projectRoot, "src/infrastructure/adapters/sqlite/create-state-stores.ts");

	it("should NOT import BranchMismatchError", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("BranchMismatchError");
	});

	it("should NOT import BranchMetaSchema", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("BranchMetaSchema");
	});

	it("should NOT have checkBranchAlignment function", () => {
		const content = readFileSync(filePath, "utf-8");
		expect(content).not.toContain("checkBranchAlignment");
	});

	it("should NOT use execSync, existsSync, readFileSync from node modules", () => {
		const content = readFileSync(filePath, "utf-8");
		// Check that it doesn't import these from node modules for branch alignment
		expect(content).not.toMatch(/import.*execSync.*from.*node:child_process/);
		expect(content).not.toMatch(/import.*existsSync.*from.*node:fs/);
		expect(content).not.toMatch(/import.*readFileSync.*from.*node:fs/);
	});
});
