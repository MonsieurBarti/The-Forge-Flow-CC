/**
 * Centralized path constants and helpers for tff-cc state.
 *
 * The in-repo `.tff-cc/` directory is a symlink to `~/.tff-cc/{projectId}/`
 * once a project is initialized via `project:init`. All production TS code
 * should build paths via these helpers so that the literal string lives in
 * exactly one place.
 */

/**
 * Canonical in-repo path for tff-cc's state symlink. Appears as a symlink
 * to ~/.tff-cc/{projectId}/ when a project is initialized via project:init.
 */
export const TFF_CC_DIR = ".tff-cc";

// --- Path builders ---------------------------------------------------------

/** Join one or more path segments under the tff-cc state directory. */
export const tffCcPath = (...parts: string[]): string => [TFF_CC_DIR, ...parts].join("/");

/** Milestone dir: .tff-cc/milestones/{milestoneLabel} */
export const milestoneDir = (milestoneLabel: string): string =>
	tffCcPath("milestones", milestoneLabel);

/** Slice dir: .tff-cc/milestones/{milestone}/slices/{slice} */
export const sliceDir = (milestoneLabel: string, sliceLabel: string): string =>
	tffCcPath("milestones", milestoneLabel, "slices", sliceLabel);

/** Worktree dir: .tff-cc/worktrees/{sliceLabel} */
export const worktreeDir = (sliceLabel: string): string => tffCcPath("worktrees", sliceLabel);

/** Observations dir: .tff-cc/observations */
export const OBSERVATIONS_DIR = tffCcPath("observations");

/** Settings file: .tff-cc/settings.yaml */
export const SETTINGS_FILE = tffCcPath("settings.yaml");

/** Project manifest: .tff-cc/PROJECT.md */
export const PROJECT_FILE = tffCcPath("PROJECT.md");

/** STATE.md at root: .tff-cc/STATE.md */
export const STATE_FILE = tffCcPath("STATE.md");

/** Milestones dir: .tff-cc/milestones */
export const MILESTONES_DIR = tffCcPath("milestones");

/** SQLite state DB: .tff-cc/state.db */
export const STATE_DB_FILE = tffCcPath("state.db");
