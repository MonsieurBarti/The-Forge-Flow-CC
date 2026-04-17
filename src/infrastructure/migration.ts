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
	const tffPath = join(repoRoot, ".tff");
	if (!existsSync(tffPath)) {
		return false;
	}
	const stats = lstatSync(tffPath);
	// Legacy pattern: .tff/ is a real directory (not symlink)
	return stats.isDirectory();
}

/**
 * Recursively copy directory contents.
 *
 * Symlinks are intentionally skipped — migrating user state should not preserve
 * symlinks that could escape the source tree (e.g. a symlink to /etc/passwd).
 * Other non-regular dirent types (sockets, fifos, devices) are also silently
 * skipped; they are never expected inside .tff/.
 */
function copyDir(src: string, dest: string): void {
	mkdirSync(dest, { recursive: true });
	const entries = readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);

		if (entry.isSymbolicLink()) {
			console.error(
				`[tff] Skipping symlink during migration: ${srcPath} (symlinks are not preserved)`,
			);
			continue;
		}
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else if (entry.isFile()) {
			copyFileSync(srcPath, destPath);
		}
		// Other dirent types (sockets, fifos, devices) are silently skipped — never expected in .tff/.
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
 *
 * After restoring, the now-redundant contents under projectHome are removed so
 * a subsequent migration attempt starts from a clean state. The home directory
 * itself is recreated by ensureProjectHomeDir on the next run.
 */
function restoreLegacyTffDir(projectHome: string, tffPath: string): void {
	if (existsSync(projectHome)) {
		copyDir(projectHome, tffPath);
		rmSync(projectHome, { recursive: true, force: true });
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
 * 6. Create symlink .tff-cc → home directory
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

	// Legacy .tff/ directory detected - migrating to home directory pattern
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
	console.error(`[tff] Migrating legacy .tff/ to ${projectHome}`);
	copyDir(tffPath, projectHome);

	// Step 4: Write project ID file (if not already present)
	if (!existsSync(join(repoRoot, ".tff-project-id"))) {
		writeProjectIdFile(repoRoot, projectId);
	}

	// Step 5: Delete legacy .tff/ directory
	deleteDir(tffPath);

	// Step 6: Create symlink .tff-cc → home directory (with rollback on failure)
	const symlinkTarget = join(repoRoot, ".tff-cc");
	try {
		symlinkSync(projectHome, symlinkTarget);
	} catch (symlinkError) {
		// Rollback: restore .tff/ directory from home directory
		console.error(`Symlink creation failed, rolling back migration: ${symlinkError}`);
		restoreLegacyTffDir(projectHome, tffPath);
		throw symlinkError;
	}
}
