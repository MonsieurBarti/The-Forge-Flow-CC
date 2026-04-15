/**
 * T01 Test: Verify state-branch domain files are deleted
 *
 * This test verifies that state-branch related files do NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these files EXIST
 * 2. Delete the files → test should pass
 * 3. Commit
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// All files that should be deleted in T01
const FILES_TO_DELETE = [
	"src/domain/ports/state-branch.port.ts",
	"src/domain/ports/state-exporter.port.ts",
	"src/domain/value-objects/state-snapshot.ts",
	"src/domain/value-objects/branch-meta.ts",
	"src/domain/value-objects/merge-result.ts",
	"src/domain/value-objects/restore-result.ts",
	"src/domain/errors/state-branch-not-found.error.ts",
	"src/domain/errors/branch-mismatch.error.ts",
];

describe("T01: Domain layer state-branch deletion", () => {
	const projectRoot = join(import.meta.dirname, "../../..");

	for (const file of FILES_TO_DELETE) {
		it(`should NOT have ${file} after deletion`, () => {
			const fullPath = join(projectRoot, file);
			// This test FAILS if file exists, PASSES if file is deleted
			expect(existsSync(fullPath)).toBe(false);
		});
	}
});
