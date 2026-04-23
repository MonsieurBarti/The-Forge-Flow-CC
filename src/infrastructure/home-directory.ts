/**
 * Home directory resolver for TFF-CC
 *
 * Provides functions for resolving and managing the centralized home directory
 * pattern (~/.tff-cc/{projectId}/) shared across all worktrees.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { TFF_CC_DIR } from "../shared/paths.js";

/** UUID v4 format validation regex */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Attempt to locate the primary (main) git worktree root for a repo.
 * Returns null when:
 *  - `repoRoot` isn't inside a git repo (e.g., first-init before `git init`)
 *  - git isn't installed / on PATH
 *  - the repo is bare (no working tree)
 */
function findPrimaryWorktreeRoot(repoRoot: string): string | null {
	try {
		const commonDir = execFileSync(
			"git",
			["-C", repoRoot, "rev-parse", "--path-format=absolute", "--git-common-dir"],
			{ encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
		).trim();
		if (!commonDir) return null;
		// For a non-bare repo, the primary worktree is the parent of the common-dir.
		// (e.g. common-dir=/path/to/repo/.git → primary=/path/to/repo)
		return dirname(commonDir);
	} catch {
		return null;
	}
}

/**
 * Resolve the git working-tree toplevel for `cwd`.
 * Returns `cwd ?? process.cwd()` when:
 *  - not inside a git repo
 *  - `git` isn't installed / on PATH
 *  - the repo is bare
 *
 * This is the single source of truth for where tff-cc state files
 * (`.tff-project-id`, `.tff-cc` symlink) live relative to the working tree,
 * so launching tff-cc from any sub-directory of a repo always finds the
 * same toplevel.
 */
export function resolveRepoRoot(cwd?: string): string {
	const start = cwd ?? process.cwd();
	try {
		const top = execFileSync("git", ["-C", start, "rev-parse", "--show-toplevel"], {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return top || start;
	} catch {
		return start;
	}
}

let warnedStrayThisProcess = false;

/**
 * Emit a one-time stderr warning if the launch cwd holds a stray
 * `.tff-project-id` or `.tff-cc` that isn't at the git toplevel.
 * No-op when cwd === repoRoot, when no stray files exist, or after the
 * first call in the current process.
 */
export function warnOnStrayTffFiles(cwd: string, repoRoot: string): void {
	if (warnedStrayThisProcess) return;
	if (cwd === repoRoot) return;
	try {
		const strayId = existsSync(join(cwd, ".tff-project-id"));
		let straySym = false;
		// Use lstatSync rather than existsSync: a dangling .tff-cc symlink
		// (broken target) is exactly the stray state we want to warn about,
		// and existsSync follows the link so it would miss that case.
		try {
			lstatSync(join(cwd, TFF_CC_DIR));
			straySym = true;
		} catch {
			// Entry does not exist — expected path.
		}
		if (!strayId && !straySym) return;
		warnedStrayThisProcess = true;
		const names = [strayId ? ".tff-project-id" : null, straySym ? ".tff-cc" : null]
			.filter((n): n is string => n !== null)
			.join(" and ");
		process.stderr.write(
			`tff-cc: stray ${names} at ${cwd} — only the one(s) at ${repoRoot} are used. Safe to delete.\n`,
		);
	} catch {
		// Never fail startup on a warning path.
	}
}

/** Validate that a string is a valid UUID v4 format. */
function isValidUuidV4(id: string): boolean {
	return UUID_V4_REGEX.test(id);
}

/**
 * Get the TFF_CC_HOME directory.
 * Returns TFF_CC_HOME env var if set, otherwise ~/.tff-cc
 */
export function getTffCcHome(): string {
	return process.env.TFF_CC_HOME ?? join(homedir(), TFF_CC_DIR);
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
 * 1. Prefer the current repo's own .tff-project-id file.
 * 2. If missing and we are in a secondary git worktree, recover from the primary worktree.
 * 3. Only mint a fresh UUID on true first-init (no git repo or no ID in primary either).
 * @param repoRoot - The repository root directory
 */
export function getProjectId(repoRoot: string): string {
	// Step 1: prefer the current repo's own file.
	const existing = readProjectIdFile(repoRoot);
	if (existing) {
		return existing;
	}

	// Step 2: if we're in a secondary git worktree, recover from the primary.
	const primaryRoot = findPrimaryWorktreeRoot(repoRoot);
	if (primaryRoot && primaryRoot !== repoRoot) {
		const recovered = readProjectIdFile(primaryRoot);
		if (recovered) {
			// Persist in this worktree so subsequent reads are O(1) and don't re-exec git.
			writeProjectIdFile(repoRoot, recovered);
			ensureProjectHomeDir(recovered);
			return recovered;
		}
	}

	// Step 3: true first-init — mint fresh.
	const projectId = randomUUID();
	writeProjectIdFile(repoRoot, projectId);
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
 * If a symlink already exists but points to the wrong target, repairs it.
 * Throws if .tff-cc/ exists as a real directory.
 */
export function createTffCcSymlink(repoRoot: string, projectId: string): void {
	const symlinkPath = join(repoRoot, TFF_CC_DIR);
	const targetPath = getProjectHome(projectId);

	if (existsSync(symlinkPath)) {
		const stats = lstatSync(symlinkPath);
		if (stats.isSymbolicLink()) {
			const currentTarget = readlinkSync(symlinkPath);
			// Compare absolute targets — we always write absolute targets below.
			if (currentTarget === targetPath) {
				return;
			}
			process.stderr.write(
				`tff-cc: repairing .tff-cc symlink in ${repoRoot} — was ${currentTarget}, now ${targetPath}\n`,
			);
			unlinkSync(symlinkPath);
			symlinkSync(targetPath, symlinkPath);
			return;
		}
		throw new Error(
			`${TFF_CC_DIR}/ exists as a real directory. Remove or rename it before proceeding.`,
		);
	}

	symlinkSync(targetPath, symlinkPath);
}
