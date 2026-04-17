/**
 * Home directory resolver for TFF-CC
 *
 * Provides functions for resolving and managing the centralized home directory
 * pattern (~/.tff-cc/{projectId}/) shared across all worktrees.
 */

import { randomUUID } from "node:crypto";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** UUID v4 format validation regex */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validate that a string is a valid UUID v4 format. */
function isValidUuidV4(id: string): boolean {
	return UUID_V4_REGEX.test(id);
}

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
 * Returns null if file doesn't exist or contains invalid UUID.
 * Validates UUID v4 format to prevent path traversal attacks.
 */
export function readProjectIdFile(repoRoot: string): string | null {
	const idPath = join(repoRoot, ".tff-project-id");
	if (!existsSync(idPath)) {
		return null;
	}
	const content = readFileSync(idPath, "utf-8").trim();
	if (!content) {
		return null;
	}
	// Validate UUID v4 format to prevent path traversal
	if (!isValidUuidV4(content)) {
		console.warn(`Invalid project ID format in ${idPath}: expected UUID v4, got "${content}"`);
		return null;
	}
	return content;
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
 * Also ensures home directory exists.
 * Note: Does NOT create symlink - caller must do that after any migration.
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
 * Creates: ~/.tff-cc/{projectId}/, ~/.tff-cc/{projectId}/milestones/, ~/.tff-cc/{projectId}/worktrees/, ~/.tff-cc/{projectId}/journal/
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
	const journalDir = join(home, "journal");

	if (!existsSync(milestonesDir)) {
		mkdirSync(milestonesDir, { recursive: true, mode: 0o700 });
	}

	if (!existsSync(worktreesDir)) {
		mkdirSync(worktreesDir, { recursive: true, mode: 0o700 });
	}

	if (!existsSync(journalDir)) {
		mkdirSync(journalDir, { recursive: true, mode: 0o700 });
	}

	return home;
}

/**
 * Create symlink from .tff-cc in repo root to project home directory.
 * Throws if .tff-cc/ exists as a real directory (migration needed).
 * @param repoRoot - The repository root directory
 * @param projectId - The project's unique identifier
 */
export function createTffCcSymlink(repoRoot: string, projectId: string): void {
	const symlinkPath = join(repoRoot, ".tff-cc");
	const targetPath = getProjectHome(projectId);

	// Check if .tff-cc exists
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
				`.tff-cc/ exists as a real directory. Remove or rename it before proceeding.`,
			);
		}
	}

	// Create symlink
	symlinkSync(targetPath, symlinkPath);
}
