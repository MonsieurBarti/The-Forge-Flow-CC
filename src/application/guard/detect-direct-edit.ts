import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";

export interface DetectDirectEditDeps {
	sessionStore: SessionStore;
	taskStore: TaskStore;
}

export interface DirectEditWarning {
	code: "NO_ACTIVE_SLICE" | "NO_CLAIMED_TASK";
	message: string;
	suggestion: string;
}

export interface DirectEditResult {
	warning: DirectEditWarning | null;
	reason:
		| "GUARD_DISABLED"
		| "NOT_INITIALIZED"
		| "CLAIMED_TASK_EXISTS"
		| "DIRECT_EDIT_DETECTED"
		| null;
}

/**
 * Check if direct-edit guards are disabled in settings.yaml.
 * Returns true if workflow.guards is explicitly false.
 */
function areGuardsDisabled(): boolean {
	const settingsPath = path.join(process.cwd(), ".tff", "settings.yaml");
	if (!existsSync(settingsPath)) {
		return false; // Default to enabled if no settings file
	}
	try {
		const content = readFileSync(settingsPath, "utf8");
		if (!content.trim()) return false;
		const parsed = parseYaml(content) as Record<string, unknown>;
		return (parsed?.workflow as Record<string, unknown> | undefined)?.guards === false;
	} catch {
		return false; // On any error, default to enabled
	}
}

/**
 * Check if the project is initialized (has .tff directory).
 */
function isProjectInitialized(): boolean {
	const tffDir = path.join(process.cwd(), ".tff");
	return existsSync(tffDir);
}

/**
 * Detect if the user is making a direct edit (code changes without workflow commands).
 *
 * Checks:
 * 1. If guards are disabled → return null (no warning)
 * 2. If project not initialized → return null (no warning)
 * 3. If no active slice claimed → return warning
 * 4. If active slice but no claimed task → return warning
 * 5. If claimed task exists → return null (workflow is active)
 *
 * @param deps - Dependencies (sessionStore, taskStore)
 * @returns DirectEditResult with warning and reason code
 */
export function detectDirectEdit(deps: DetectDirectEditDeps): DirectEditResult {
	// Fast path: check if guards are disabled
	if (areGuardsDisabled()) {
		return {
			warning: null,
			reason: "GUARD_DISABLED",
		};
	}

	// Check if project is initialized
	if (!isProjectInitialized()) {
		return {
			warning: null,
			reason: "NOT_INITIALIZED",
		};
	}

	// Check for active session
	const sessionResult = deps.sessionStore.getSession();

	// Handle branch mismatch or other errors gracefully
	if (!sessionResult.ok) {
		return {
			warning: {
				code: "NO_ACTIVE_SLICE",
				message: "No active workflow session. Direct edits bypass /tff tracking.",
				suggestion: "Use /tff:quick for tracked fixes, or /tff:start to begin a slice.",
			},
			reason: "DIRECT_EDIT_DETECTED",
		};
	}

	const session = sessionResult.data;

	// No active slice
	if (!session || !session.activeSliceId) {
		return {
			warning: {
				code: "NO_ACTIVE_SLICE",
				message: "No active workflow session. Direct edits bypass /tff tracking.",
				suggestion: "Use /tff:quick for tracked fixes, or /tff:start to begin a slice.",
			},
			reason: "DIRECT_EDIT_DETECTED",
		};
	}

	// Check for claimed tasks in the active slice
	const tasksResult = deps.taskStore.listTasks(session.activeSliceId);

	// Handle errors gracefully - assume no claimed tasks on error
	if (!tasksResult.ok) {
		return {
			warning: {
				code: "NO_CLAIMED_TASK",
				message: `No claimed task in ${session.activeSliceId}. Direct edits bypass /tff tracking.`,
				suggestion: "Use /tff:quick for tracked fixes, or /tff:claim to take a task.",
			},
			reason: "DIRECT_EDIT_DETECTED",
		};
	}

	const tasks = tasksResult.data;

	// A task is claimed if status is 'in_progress' (which implies claimedAt is set)
	const hasClaimedTask = tasks.some((t) => t.status === "in_progress");

	if (hasClaimedTask) {
		return {
			warning: null,
			reason: "CLAIMED_TASK_EXISTS",
		};
	}

	// Active slice exists but no claimed task
	return {
		warning: {
			code: "NO_CLAIMED_TASK",
			message: `No claimed task in ${session.activeSliceId}. Direct edits bypass /tff tracking.`,
			suggestion: "Use /tff:quick for tracked fixes, or /tff:claim to take a task.",
		},
		reason: "DIRECT_EDIT_DETECTED",
	};
}
