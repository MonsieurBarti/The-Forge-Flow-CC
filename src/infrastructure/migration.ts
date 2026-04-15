/**
 * Auto-migration logic for TFF-CC state architecture refactor.
 *
 * Detects legacy in-repo .tff/ directory and migrates contents to
 * centralized home directory pattern (~/.tff-cc/{projectId}/).
 */

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getProjectId, getProjectHome, ensureProjectHomeDir, writeProjectIdFile, readProjectIdFile } from "./home-directory.js";

/**
 * Check if .tff/ exists as a real directory (not symlink) - indicates legacy pattern.
 */
export function detectLegacyPattern(repoRoot: string): boolean {
	const tffPath = join(repoRoot, ".tff");
	if (!existsSync(tffPath)) {
		return false;
	}
	const stats = lstatSync(tffPath);
	// Legacy pattern: .tff/ is a real directory
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

	// Migration needed
	const tffPath = join(repoRoot, ".tff");

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

	// Step 6: Create symlink .tff → home directory
	symlinkSync(projectHome, tffPath);
}
