/**
 * T07 Test: Verify StateBranchPort removed from application use cases
 *
 * This test verifies that application use cases no longer import or use StateBranchPort.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these files import StateBranchPort
 * 2. Remove StateBranchPort usage → test should pass
 * 3. Commit
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES_TO_CHECK = [
	"src/application/milestone/create-milestone.ts",
	"src/application/project/init-project.ts",
	"src/application/slice/create-slice.ts",
];

describe("T07: Application use cases StateBranchPort removal", () => {
	const projectRoot = join(import.meta.dirname, "../../..");

	for (const file of FILES_TO_CHECK) {
		it(`should NOT import StateBranchPort in ${file}`, () => {
			const fullPath = join(projectRoot, file);
			const content = readFileSync(fullPath, "utf-8");

			// Should NOT have StateBranchPort import
			expect(content).not.toContain("StateBranchPort");
		});

		it(`should NOT have stateBranch property in deps interface in ${file}`, () => {
			const fullPath = join(projectRoot, file);
			const content = readFileSync(fullPath, "utf-8");

			// Should NOT have stateBranch?: StateBranchPort in deps
			expect(content).not.toMatch(/stateBranch\s*\??\s*:\s*StateBranchPort/);
		});
	}
});
