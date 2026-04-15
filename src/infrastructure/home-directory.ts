/**
 * Home directory resolver for TFF-CC
 *
 * Provides functions for resolving and managing the centralized home directory
 * pattern (~/.tff-cc/{projectId}/) shared across all worktrees.
 */

import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Get the TFF_CC_HOME directory.
 * Returns TFF_CC_HOME env var if set, otherwise ~/.tff-cc
 */
export function getTffCcHome(): string {
	return process.env.TFF_CC_HOME ?? join(homedir(), ".tff-cc");
}

/**
 * Get the project home directory under TFF_CC_HOME.
 * @param projectId - The project's unique identifier
 */
export function getProjectHome(projectId: string): string {
	return join(getTffCcHome(), projectId);
}

/**
 * Read project ID from .tff-project-id file.
 * Returns null if file doesn't exist.
 */
export function readProjectIdFile(repoRoot: string): string | null {
	const idPath = join(repoRoot, ".tff-project-id");
	if (!existsSync(idPath)) {
		return null;
	}
	const content = readFileSync(idPath, "utf-8").trim();
	return content || null;
}

/**
 * Write project ID to .tff-project-id file.
 */
export function writeProjectIdFile(repoRoot: string, projectId: string): void {
	const idPath = join(repoRoot, ".tff-project-id");
	writeFileSync(idPath, `${projectId}\n`, "utf-8");
}

/**
 * Get or generate the project ID.
 * If .tff-project-id exists, reads it. Otherwise generates a new UUID v4 and writes it.
 * @param repoRoot - The repository root directory
 */
export function getProjectId(repoRoot: string): string {
	const existing = readProjectIdFile(repoRoot);
	if (existing) {
		return existing;
	}

	// Generate new UUID v4
	const projectId = randomUUID();
	writeProjectIdFile(repoRoot, projectId);

	// Ensure home directory exists for new projects
	ensureProjectHomeDir(projectId);

	return projectId;
}

/**
 * Ensure the project home directory exists with required subdirectories.
 * Creates: ~/.tff-cc/{projectId}/, ~/.tff-cc/{projectId}/milestones/, ~/.tff-cc/{projectId}/worktrees/
 * @param projectId - The project's unique identifier
 * @returns The project home directory path
 */
export function ensureProjectHomeDir(projectId: string): string {
	const home = getProjectHome(projectId);

	// Create main directory with secure permissions
	if (!existsSync(home)) {
		mkdirSync(home, { recursive: true, mode: 0o700 });
	}

	// Create subdirectories
	const milestonesDir = join(home, "milestones");
	const worktreesDir = join(home, "worktrees");

	if (!existsSync(milestonesDir)) {
		mkdirSync(milestonesDir, { recursive: true, mode: 0o700 });
	}

	if (!existsSync(worktreesDir)) {
		mkdirSync(worktreesDir, { recursive: true, mode: 0o700 });
	}

	return home;
}

/**
 * Create symlink from .tff in repo root to project home directory.
 * Throws if .tff/ exists as a real directory (migration needed).
 * @param repoRoot - The repository root directory
 * @param projectId - The project's unique identifier
 */
export function createTffSymlink(repoRoot: string, projectId: string): void {
	const symlinkPath = join(repoRoot, ".tff");
	const targetPath = getProjectHome(projectId);

	// Check if .tff exists
	if (existsSync(symlinkPath)) {
		// Check if it's a symlink
		const stats = lstatSync(symlinkPath);
		if (stats.isSymbolicLink()) {
			// Symlink already exists, verify it points to correct target
			// For now, just return - symlink is already there
			return;
		} else {
			// Real directory exists - migration needed
			throw new Error(
				`.tff/ exists as a real directory. Run migration first to move contents to ~/.tff-cc/${projectId}/`,
			);
		}
	}

	// Create symlink
	symlinkSync(targetPath, symlinkPath);
}
