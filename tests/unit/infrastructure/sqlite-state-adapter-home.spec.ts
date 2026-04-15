/**
 * T15 Test: SQLiteStateAdapter home directory integration
 *
 * This test verifies SQLiteStateAdapter uses home directory path derivation.
 *
 * TDD Cycle:
 * 1. Write failing test → currently create() requires path parameter
 * 2. Implement change → test should pass
 * 3. Commit
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("T15: SQLiteStateAdapter home directory integration", () => {
	let tempDir: string;
	let originalTffCcHome: string | undefined;

	beforeEach(() => {
		tempDir = mkdirSync(join(tmpdir(), `tff-test-${Date.now()}`), { recursive: true });
		originalTffCcHome = process.env.TFF_CC_HOME;
	});

	afterEach(() => {
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("create() with home directory", () => {
		it("should create adapter with path derived from home directory", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "test-project");
			mkdirSync(projectDir, { recursive: true });
			writeFileSync(join(projectDir, ".tff-project-id"), "test-project-id-123\n");

			const { SQLiteStateAdapter } = await import(
				"../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js"
			);
			const { ensureProjectHomeDir } = await import(
				"../../../src/infrastructure/home-directory.js"
			);

			// Ensure home dir exists
			ensureProjectHomeDir("test-project-id-123");

			// Change cwd to project dir for getProjectId to work
			const originalCwd = process.cwd();
			process.chdir(projectDir);

			try {
				// Create adapter using new signature
				const adapter = SQLiteStateAdapter.create();
				const initResult = adapter.init();

				expect(initResult.ok).toBe(true);

				// Verify database was created in home directory
				const dbPath = join(tempDir, "test-project-id-123", "state.db");
				expect(existsSync(dbPath)).toBe(true);

				adapter.close();
			} finally {
				process.chdir(originalCwd);
			}
		});

		it("should keep createInMemory() for testing", async () => {
			const { SQLiteStateAdapter } = await import(
				"../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js"
			);

			const adapter = SQLiteStateAdapter.createInMemory();
			const initResult = adapter.init();

			expect(initResult.ok).toBe(true);
			adapter.close();
		});

		it("should keep createWithPath() for backward compatibility", async () => {
			const { SQLiteStateAdapter } = await import(
				"../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js"
			);

			const dbPath = join(tempDir, "custom-path.db");
			const adapter = SQLiteStateAdapter.createWithPath(dbPath);
			const initResult = adapter.init();

			expect(initResult.ok).toBe(true);
			expect(existsSync(dbPath)).toBe(true);

			adapter.close();
		});
	});
});
