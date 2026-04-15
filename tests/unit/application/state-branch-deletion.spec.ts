/**
 * T03 Test: Verify application state-branch directory is deleted
 *
 * This test verifies that the state-branch use case directory does NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently this directory EXISTS
 * 2. Delete the directory → test should pass
 * 3. Commit
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

describe("T03: Application state-branch directory deletion", () => {
	const projectRoot = join(import.meta.dirname, "../../..");

	it("should NOT have src/application/state-branch/ directory after deletion", () => {
		const dirPath = join(projectRoot, "src/application/state-branch");
		expect(existsSync(dirPath)).toBe(false);
	});
});
