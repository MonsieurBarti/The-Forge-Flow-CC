/**
 * T06 Test: Verify state-branch test files are deleted
 *
 * This test verifies that state-branch related test files do NOT exist.
 *
 * TDD Cycle:
 * 1. Write failing test → currently these files EXIST
 * 2. Delete the files → test should pass
 * 3. Commit
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

const FILES_TO_DELETE = [
	// Unit tests - domain
	"tests/unit/domain/ports/state-branch.port.spec.ts",
	"tests/unit/domain/errors/branch-mismatch.error.spec.ts",

	// Unit tests - infrastructure
	"tests/unit/infrastructure/adapters/git/git-state-branch.adapter.spec.ts",
	"tests/unit/infrastructure/adapters/export/sqlite-state-exporter.spec.ts",
	"tests/unit/infrastructure/adapters/export/sqlite-state-importer.spec.ts",
	"tests/unit/infrastructure/hooks/branch-meta-stamp.spec.ts",

	// Unit tests - CLI
	"tests/unit/cli/commands/state-branch-commands.spec.ts",
	"tests/unit/cli/with-branch-guard.spec.ts",

	// Unit tests - application
	"tests/unit/application/state-branch/restore-branch.spec.ts",
	"tests/unit/application/state-branch/sync-branch.spec.ts",

	// Integration tests
	"tests/integration/state-branch.integration.spec.ts",
	"tests/integration/restore-branch-json.integration.spec.ts",
	"tests/integration/sync-branch-json.integration.spec.ts",
	"tests/integration/post-checkout-restore.integration.spec.ts",
	"tests/integration/pre-op-guard.integration.spec.ts",

	// CLI command tests for state-branch
	"tests/unit/cli/commands/hook-post-checkout.cmd.spec.ts",
];

const DIRS_TO_DELETE = [
	"tests/unit/infrastructure/adapters/export",
	"tests/unit/application/state-branch",
];

describe("T06: State-branch test file deletion", () => {
	const projectRoot = process.cwd();

	for (const file of FILES_TO_DELETE) {
		it(`should NOT have ${file} after deletion`, () => {
			const fullPath = join(projectRoot, file);
			expect(existsSync(fullPath)).toBe(false);
		});
	}

	for (const dir of DIRS_TO_DELETE) {
		it(`should NOT have ${dir}/ directory after deletion`, () => {
			const fullPath = join(projectRoot, dir);
			expect(existsSync(fullPath)).toBe(false);
		});
	}
});
