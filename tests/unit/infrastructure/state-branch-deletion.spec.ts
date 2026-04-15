/**
 * T02 Test: Verify state-branch infrastructure files are deleted
 *
 * This test verifies that state-branch related infrastructure files do NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these files EXIST
 * 2. Delete the files → test should pass
 * 3. Commit
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// All files that should be deleted in T02
const FILES_TO_DELETE = [
	"src/infrastructure/adapters/git/git-state-branch.adapter.ts",
	"src/infrastructure/adapters/export/sqlite-state-exporter.ts",
	"src/infrastructure/adapters/export/sqlite-state-importer.ts",
	"src/infrastructure/hooks/branch-meta-stamp.ts",
];

describe("T02: Infrastructure layer state-branch deletion", () => {
	const projectRoot = join(import.meta.dirname, "../../..");

	for (const file of FILES_TO_DELETE) {
		it(`should NOT have ${file} after deletion`, () => {
			const fullPath = join(projectRoot, file);
			// This test FAILS if file exists, PASSES if file is deleted
			expect(existsSync(fullPath)).toBe(false);
		});
	}

	it("should NOT have export/ directory after deletion", () => {
		const exportDir = join(projectRoot, "src/infrastructure/adapters/export");
		// The export directory should be deleted entirely (empty after file deletions)
		expect(existsSync(exportDir)).toBe(false);
	});
});
