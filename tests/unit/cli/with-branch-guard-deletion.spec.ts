/**
 * T05 Test: Verify with-branch-guard.ts is deleted
 *
 * This test verifies that with-branch-guard.ts does NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently this file EXISTS
 * 2. Delete the file → test should pass
 * 3. Commit
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

describe("T05: with-branch-guard.ts deletion", () => {
	const projectRoot = process.cwd();

	it("should NOT have src/cli/with-branch-guard.ts after deletion", () => {
		const fullPath = join(projectRoot, "src/cli/with-branch-guard.ts");
		expect(existsSync(fullPath)).toBe(false);
	});
});
