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
    reason: "GUARD_DISABLED" | "NOT_INITIALIZED" | "CLAIMED_TASK_EXISTS" | "DIRECT_EDIT_DETECTED" | null;
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
export declare function detectDirectEdit(deps: DetectDirectEditDeps): DirectEditResult;
//# sourceMappingURL=detect-direct-edit.d.ts.map