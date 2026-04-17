/**
 * T14 Test: Home directory resolver module
 *
 * This test verifies the home directory resolver functions work correctly.
 *
 * TDD Cycle:
 * 1. Write failing test → currently module doesn't exist
 * 2. Implement the module → test should pass
 * 3. Commit
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("T14: Home directory resolver module", () => {
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

	describe("getTffCcHome", () => {
		it("should return TFF_CC_HOME env var when set", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const { getTffCcHome } = await import("../../../src/infrastructure/home-directory.js");
			expect(getTffCcHome()).toBe(tempDir);
		});

		it("should return ~/.tff-cc when TFF_CC_HOME not set", async () => {
			delete process.env.TFF_CC_HOME;
			const { getTffCcHome } = await import("../../../src/infrastructure/home-directory.js");
			const home = getTffCcHome();
			expect(home).toMatch(/\.tff-cc$/);
		});
	});

	describe("getProjectHome", () => {
		it("should return path under TFF_CC_HOME with project ID", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const { getProjectHome } = await import("../../../src/infrastructure/home-directory.js");
			const projectHome = getProjectHome("abc123");
			expect(projectHome).toBe(join(tempDir, "abc123"));
		});
	});

	describe("getProjectId", () => {
		it("should read project ID from .tff-project-id file", async () => {
			const projectDir = join(tempDir, "project1");
			mkdirSync(projectDir, { recursive: true });
			// Use valid UUID v4 format
			writeFileSync(join(projectDir, ".tff-project-id"), "abc12345-def4-4000-8000-123456789abc\n");

			const { getProjectId } = await import("../../../src/infrastructure/home-directory.js");
			const projectId = getProjectId(projectDir);
			expect(projectId).toBe("abc12345-def4-4000-8000-123456789abc");
		});

		it("should generate new UUID if .tff-project-id missing", async () => {
			const projectDir = join(tempDir, "project2");
			mkdirSync(projectDir, { recursive: true });

			const { getProjectId } = await import("../../../src/infrastructure/home-directory.js");
			const projectId = getProjectId(projectDir);
			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			expect(projectId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			// Should have written the file
			expect(existsSync(join(projectDir, ".tff-project-id"))).toBe(true);
		});
	});

	describe("ensureProjectHomeDir", () => {
		it("should create directory structure under TFF_CC_HOME", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const { ensureProjectHomeDir } = await import(
				"../../../src/infrastructure/home-directory.js"
			);

			const home = ensureProjectHomeDir("test-project-id");

			expect(existsSync(home)).toBe(true);
			expect(existsSync(join(home, "milestones"))).toBe(true);
			expect(existsSync(join(home, "worktrees"))).toBe(true);
		});
	});

	describe("createTffCcSymlink", () => {
		it("should create symlink from .tff-cc to project home", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "project3");
			mkdirSync(projectDir, { recursive: true });

			const { createTffCcSymlink, ensureProjectHomeDir } = await import(
				"../../../src/infrastructure/home-directory.js"
			);
			const _projectHome = ensureProjectHomeDir("symlink-test");
			createTffCcSymlink(projectDir, "symlink-test");

			const symlinkPath = join(projectDir, ".tff-cc");
			expect(existsSync(symlinkPath)).toBe(true);
		});

		it("should throw if .tff-cc/ is a real directory (migration needed)", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "project4");
			mkdirSync(projectDir, { recursive: true });
			mkdirSync(join(projectDir, ".tff-cc"), { recursive: true }); // Real directory, not symlink

			const { createTffCcSymlink } = await import("../../../src/infrastructure/home-directory.js");

			expect(() => createTffCcSymlink(projectDir, "migration-test")).toThrow();
		});
	});

	describe("readProjectIdFile / writeProjectIdFile", () => {
		it("should write and read project ID file", async () => {
			const projectDir = join(tempDir, "project5");
			mkdirSync(projectDir, { recursive: true });

			const { readProjectIdFile, writeProjectIdFile } = await import(
				"../../../src/infrastructure/home-directory.js"
			);

			// Use valid UUID v4 format
			const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
			writeProjectIdFile(projectDir, validUuid);
			expect(readProjectIdFile(projectDir)).toBe(validUuid);
		});

		it("should return null if file doesn't exist", async () => {
			const projectDir = join(tempDir, "project6");
			mkdirSync(projectDir, { recursive: true });

			const { readProjectIdFile } = await import("../../../src/infrastructure/home-directory.js");

			expect(readProjectIdFile(projectDir)).toBe(null);
		});

		it("should return null for invalid UUID format (path traversal protection)", async () => {
			const projectDir = join(tempDir, "project7");
			mkdirSync(projectDir, { recursive: true });

			// Write invalid ID (path traversal attempt)
			writeFileSync(join(projectDir, ".tff-project-id"), "../../../etc/passwd\n");

			const { readProjectIdFile } = await import("../../../src/infrastructure/home-directory.js");

			// Should reject invalid format
			expect(readProjectIdFile(projectDir)).toBe(null);
		});

		it("should return null for non-UUID string", async () => {
			const projectDir = join(tempDir, "project8");
			mkdirSync(projectDir, { recursive: true });

			writeFileSync(join(projectDir, ".tff-project-id"), "not-a-uuid\n");

			const { readProjectIdFile } = await import("../../../src/infrastructure/home-directory.js");

			expect(readProjectIdFile(projectDir)).toBe(null);
		});
	});
});
