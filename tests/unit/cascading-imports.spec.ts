/**
 * T12 Test: Verify no cascading import errors
 *
 * This test verifies that no remaining files import deleted modules.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these imports EXIST
 * 2. Fix the imports → test should pass
 * 3. Commit
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("T12: Fix cascading import errors", () => {
	it(
		"should have no TypeScript errors",
		{ timeout: 30000 },
		() => {
			// Run typecheck and expect it to succeed
			const result = execSync("bun run typecheck 2>&1", {
				encoding: "utf-8",
			});
			// If typecheck passes, this will pass
			expect(result).not.toContain("error TS");
		},
	);
});
