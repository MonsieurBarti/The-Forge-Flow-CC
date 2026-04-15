import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
export interface GenerateReminderDeps {
    sessionStore: SessionStore;
    taskStore: TaskStore;
    dependencyStore: DependencyStore;
}
/**
 * Generate a compact reminder string for the current session state.
 * Returns null if no active session exists.
 */
export declare function generateReminder(deps: GenerateReminderDeps): string | null;
//# sourceMappingURL=generate-reminder.d.ts.map