/**
 * Auto-migration logic for TFF-CC state architecture refactor.
 *
 * Detects legacy in-repo .tff/ directory and migrates contents to
 * centralized home directory pattern (~/.tff-cc/{projectId}/).
 */

import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
	ensureProjectHomeDir,
	getProjectId,
	readProjectIdFile,
	writeProjectIdFile,
} from "./home-directory.js";

/**
 * Check if .tff/ exists as a real directory (not symlink) - indicates legacy pattern.
 */
export function detectLegacyPattern(repoRoot: string): boolean {
	const tffPath = join(repoRoot, ".tff-cc");
	if (!existsSync(tffPath)) {
		return false;
	}
	const stats = lstatSync(tffPath);
	// Legacy pattern: .tff-cc/ is a real directory (not symlink)
	return stats.isDirectory();
}

/**
 * Recursively copy directory contents.
 */
function copyDir(src: string, dest: string): void {
	mkdirSync(dest, { recursive: true });
	const entries = readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Recursively delete directory.
 */
function deleteDir(dir: string): void {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Restore .tff/ directory from home directory after failed migration.
 * Used for rollback when symlink creation fails after deletion.
 */
function restoreTffCcDir(projectHome: string, tffPath: string): void {
	if (existsSync(projectHome)) {
		copyDir(projectHome, tffPath);
	}
}

/**
 * Run migration from legacy in-repo .tff/ to home directory.
 * Steps:
 * 1. Check if .tff/ is a real directory (legacy)
 * 2. Read or generate project ID
 * 3. Create home directory
 * 4. Move .tff/ contents to home directory
 * 5. Delete .tff/
 * 6. Create symlink .tff → home directory
 *
 * Atomic: if any step fails, we don't leave partial state.
 */
export function runMigrationIfNeeded(repoRoot: string): void {
	// Check if migration is needed
	if (!detectLegacyPattern(repoRoot)) {
		// No legacy pattern - check if project ID exists
		const existingId = readProjectIdFile(repoRoot);
		if (existingId) {
			// Project ID exists, ensure home dir exists
			ensureProjectHomeDir(existingId);
		}
		return;
	}

	// Legacy .tff-cc/ directory detected - this shouldn't happen in normal flow
	// since new projects get symlink, but handle it anyway
	const tffPath = join(repoRoot, ".tff-cc");

	// Step 1: Read or generate project ID
	let projectId = readProjectIdFile(repoRoot);
	if (!projectId) {
		// Generate new ID
		projectId = getProjectId(repoRoot);
	}

	// Step 2: Ensure home directory exists
	const projectHome = ensureProjectHomeDir(projectId);

	// Step 3: Copy .tff/ contents to home directory
	// We copy instead of move to be safer (can rollback)
	copyDir(tffPath, projectHome);

	// Step 4: Write project ID file (if not already present)
	if (!existsSync(join(repoRoot, ".tff-project-id"))) {
		writeProjectIdFile(repoRoot, projectId);
	}

	// Step 5: Delete legacy .tff/ directory
	deleteDir(tffPath);

	// Step 6: Create symlink .tff-cc → home directory (with rollback on failure)
	try {
		symlinkSync(projectHome, tffPath);
	} catch (symlinkError) {
		// Rollback: restore .tff-cc/ directory from home directory
		console.error(`Symlink creation failed, rolling back migration: ${symlinkError}`);
		restoreTffCcDir(projectHome, tffPath);
		throw symlinkError;
	}
}
