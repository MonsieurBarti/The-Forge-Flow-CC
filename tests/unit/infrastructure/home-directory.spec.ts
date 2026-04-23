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

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

		it("recovers project id from primary worktree when secondary is missing the file", async () => {
			process.env.TFF_CC_HOME = join(tempDir, "tff-home");
			mkdirSync(process.env.TFF_CC_HOME, { recursive: true });

			// Set up a real git primary worktree with a committed .tff-project-id
			const primaryDir = join(tempDir, "primary-repo");
			mkdirSync(primaryDir, { recursive: true });
			execFileSync("git", ["init", primaryDir]);
			execFileSync("git", ["-C", primaryDir, "config", "user.email", "test@test.com"]);
			execFileSync("git", ["-C", primaryDir, "config", "user.name", "Test"]);

			const primaryUuid = "a1b2c3d4-e5f6-4000-8000-111111111111";
			writeFileSync(join(primaryDir, ".tff-project-id"), `${primaryUuid}\n`);
			execFileSync("git", ["-C", primaryDir, "add", ".tff-project-id"]);
			execFileSync("git", ["-C", primaryDir, "commit", "-m", "add project id"]);

			// Create a secondary worktree (no .tff-project-id file in it)
			const secondaryDir = join(tempDir, "secondary-worktree");
			mkdirSync(secondaryDir, { recursive: true });
			execFileSync("git", ["-C", primaryDir, "worktree", "add", "--detach", secondaryDir]);

			const { getProjectId } = await import("../../../src/infrastructure/home-directory.js");
			const recovered = getProjectId(secondaryDir);

			// Should return the primary's UUID
			expect(recovered).toBe(primaryUuid);
			// Should have written the file into the secondary worktree
			expect(existsSync(join(secondaryDir, ".tff-project-id"))).toBe(true);
		});

		it("mints fresh when not in a git repo", async () => {
			process.env.TFF_CC_HOME = join(tempDir, "tff-home-fresh");
			mkdirSync(process.env.TFF_CC_HOME, { recursive: true });

			// A plain temp directory — not git-initialized
			const plainDir = join(tempDir, "not-a-git-repo");
			mkdirSync(plainDir, { recursive: true });

			const { getProjectId } = await import("../../../src/infrastructure/home-directory.js");
			const minted = getProjectId(plainDir);

			expect(minted).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			expect(existsSync(join(plainDir, ".tff-project-id"))).toBe(true);
		});
	});

	describe("resolveRepoRoot", () => {
		it("returns the git toplevel when called from the repo root", async () => {
			const repoDir = join(tempDir, "repo-root");
			mkdirSync(repoDir, { recursive: true });
			execFileSync("git", ["init", repoDir]);

			const { resolveRepoRoot } = await import("../../../src/infrastructure/home-directory.js");
			const expected = (await import("node:fs")).realpathSync(repoDir);
			expect(resolveRepoRoot(repoDir)).toBe(expected);
		});

		it("returns the git toplevel when called from a sub-directory", async () => {
			const repoDir = join(tempDir, "repo-subdir");
			const subDir = join(repoDir, "apps", "api");
			mkdirSync(subDir, { recursive: true });
			execFileSync("git", ["init", repoDir]);

			const { resolveRepoRoot } = await import("../../../src/infrastructure/home-directory.js");
			const expected = (await import("node:fs")).realpathSync(repoDir);
			expect(resolveRepoRoot(subDir)).toBe(expected);
		});

		it("falls back to the input cwd when not in a git repo", async () => {
			const plainDir = join(tempDir, "not-a-git-repo-resolve");
			mkdirSync(plainDir, { recursive: true });

			const { resolveRepoRoot } = await import("../../../src/infrastructure/home-directory.js");
			expect(resolveRepoRoot(plainDir)).toBe(plainDir);
		});
	});

	describe("warnOnStrayTffFiles", () => {
		let stderrSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
			// Reset the module-level guard so each test starts fresh
			vi.resetModules();
		});

		afterEach(() => {
			stderrSpy.mockRestore();
		});

		it("is a no-op when cwd === repoRoot", async () => {
			const dir = join(tempDir, "stray-noop-same");
			mkdirSync(dir, { recursive: true });
			writeFileSync(join(dir, ".tff-project-id"), "a1b2c3d4-e5f6-4000-8000-111111111111\n");

			const { warnOnStrayTffFiles } = await import(
				"../../../src/infrastructure/home-directory.js"
			);
			warnOnStrayTffFiles(dir, dir);

			expect(stderrSpy).not.toHaveBeenCalled();
		});

		it("is a no-op when no stray files exist", async () => {
			const repoRoot = join(tempDir, "stray-noop-repo");
			const subDir = join(repoRoot, "apps", "api");
			mkdirSync(subDir, { recursive: true });

			const { warnOnStrayTffFiles } = await import(
				"../../../src/infrastructure/home-directory.js"
			);
			warnOnStrayTffFiles(subDir, repoRoot);

			expect(stderrSpy).not.toHaveBeenCalled();
		});

		it("emits exactly one stderr line when a stray .tff-project-id exists below the root", async () => {
			const repoRoot = join(tempDir, "stray-hit-repo");
			const subDir = join(repoRoot, "apps", "api");
			mkdirSync(subDir, { recursive: true });
			writeFileSync(join(subDir, ".tff-project-id"), "a1b2c3d4-e5f6-4000-8000-222222222222\n");

			const { warnOnStrayTffFiles } = await import(
				"../../../src/infrastructure/home-directory.js"
			);
			warnOnStrayTffFiles(subDir, repoRoot);
			warnOnStrayTffFiles(subDir, repoRoot); // second call must stay silent

			expect(stderrSpy).toHaveBeenCalledTimes(1);
			const line = stderrSpy.mock.calls[0][0] as string;
			expect(line).toContain("stray");
			expect(line).toContain(subDir);
			expect(line).toContain(repoRoot);
		});

		it("also warns when only .tff-cc exists (no .tff-project-id)", async () => {
			const repoRoot = join(tempDir, "stray-symlink-repo");
			const subDir = join(repoRoot, "apps", "web");
			mkdirSync(subDir, { recursive: true });
			const { symlinkSync } = await import("node:fs");
			symlinkSync(join(tempDir, "some-target"), join(subDir, ".tff-cc"));

			const { warnOnStrayTffFiles } = await import(
				"../../../src/infrastructure/home-directory.js"
			);
			warnOnStrayTffFiles(subDir, repoRoot);

			expect(stderrSpy).toHaveBeenCalledTimes(1);
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

		it("should throw if .tff-cc/ is a real directory", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "project4");
			mkdirSync(projectDir, { recursive: true });
			mkdirSync(join(projectDir, ".tff-cc"), { recursive: true }); // Real directory, not symlink

			const { createTffCcSymlink } = await import("../../../src/infrastructure/home-directory.js");

			expect(() => createTffCcSymlink(projectDir, "migration-test")).toThrow();
		});

		it("repairs a drifted symlink target", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "project-drift");
			mkdirSync(projectDir, { recursive: true });

			const { createTffCcSymlink, ensureProjectHomeDir, getProjectHome } = await import(
				"../../../src/infrastructure/home-directory.js"
			);

			const oldProjectId = "old00000-0000-4000-8000-000000000000";
			const newProjectId = "new00000-0000-4000-8000-111111111111";

			// Pre-create a symlink pointing to the old target
			const oldTarget = join(tempDir, oldProjectId);
			mkdirSync(oldTarget, { recursive: true });
			const symlinkPath = join(projectDir, ".tff-cc");
			const { symlinkSync } = await import("node:fs");
			symlinkSync(oldTarget, symlinkPath);

			// Ensure new project home exists so the symlink target is valid
			ensureProjectHomeDir(newProjectId);

			// Repair
			createTffCcSymlink(projectDir, newProjectId);

			// Symlink should now point to the new target
			const actualTarget = readlinkSync(symlinkPath);
			expect(actualTarget).toBe(getProjectHome(newProjectId));
		});

		it("leaves a correct symlink alone", async () => {
			process.env.TFF_CC_HOME = tempDir;
			const projectDir = join(tempDir, "project-correct-symlink");
			mkdirSync(projectDir, { recursive: true });

			const { createTffCcSymlink, ensureProjectHomeDir, getProjectHome } = await import(
				"../../../src/infrastructure/home-directory.js"
			);

			const projectId = "correct0-0000-4000-8000-000000000000";
			ensureProjectHomeDir(projectId);

			// Create the correct symlink first
			createTffCcSymlink(projectDir, projectId);

			const symlinkPath = join(projectDir, ".tff-cc");
			const targetBefore = readlinkSync(symlinkPath);

			// Call again — should not throw and target should be unchanged
			createTffCcSymlink(projectDir, projectId);
			const targetAfter = readlinkSync(symlinkPath);

			expect(targetAfter).toBe(targetBefore);
			expect(targetAfter).toBe(getProjectHome(projectId));
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
