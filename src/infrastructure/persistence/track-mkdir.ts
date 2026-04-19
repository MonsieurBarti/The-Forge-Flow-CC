import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Recursive mkdir that returns the list of directories it actually created
 * (i.e. dirs that did NOT exist before the call), ordered **leaf-first** so
 * callers can hand the list to `cleanupDirs()` on rollback without worrying
 * about parent-before-child ordering. Already-existing path segments are
 * never returned, so rollback cleanup will never nuke pre-existing state.
 *
 * The non-recursive rmSync used in cleanup further guarantees safety: it
 * refuses to remove non-empty directories, so even if an ancestor is shared
 * with unrelated state, nothing gets deleted that shouldn't be.
 */
export const mkdirTracked = (absDir: string): string[] => {
	// Walk up from absDir collecting every ancestor that does NOT exist yet.
	const missing: string[] = [];
	let cur = absDir;
	while (!existsSync(cur)) {
		missing.push(cur);
		const parent = dirname(cur);
		if (parent === cur) break; // reached FS root
		cur = parent;
	}
	mkdirSync(absDir, { recursive: true });
	// missing is already leaf-first (we pushed the deepest dir first).
	return missing;
};
