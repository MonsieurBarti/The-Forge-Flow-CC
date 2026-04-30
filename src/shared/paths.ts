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

/** Quick bucket: .tff-cc/quick */
export const QUICK_DIR = tffCcPath("quick");

/** Debug bucket: .tff-cc/debug */
export const DEBUG_DIR = tffCcPath("debug");

/** Quick slice dir: .tff-cc/quick/{label} */
export const quickSliceDir = (sliceLabel: string): string => tffCcPath("quick", sliceLabel);

/** Debug slice dir: .tff-cc/debug/{label} */
export const debugSliceDir = (sliceLabel: string): string => tffCcPath("debug", sliceLabel);

/**
 * Dispatch slice dir by kind. Milestone-bound slices live under
 * .tff-cc/milestones/{milestoneLabel}/slices/{sliceLabel}; ad-hoc quick/debug
 * slices live under their dedicated buckets.
 */
export const sliceDirFor = (
	slice: { kind: "milestone" | "quick" | "debug" },
	milestoneLabel: string | undefined,
	sliceLabel: string,
): string => {
	if (slice.kind === "milestone") {
		if (!milestoneLabel) {
			throw new Error("sliceDirFor: milestoneLabel required when slice.kind === 'milestone'");
		}
		return sliceDir(milestoneLabel, sliceLabel);
	}
	if (slice.kind === "quick") return quickSliceDir(sliceLabel);
	return debugSliceDir(sliceLabel);
};
