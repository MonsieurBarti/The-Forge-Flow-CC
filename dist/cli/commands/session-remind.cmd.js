import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { generateReminder } from "../../application/session/generate-reminder.js";
import { loadProjectSettings } from "../../domain/value-objects/project-settings.js";
import { withBranchGuard } from "../with-branch-guard.js";
/**
 * Check if reminders are disabled in settings.yaml.
 * Returns true if workflow.reminders is explicitly false.
 */
function areRemindersDisabled() {
    const settingsPath = path.join(process.cwd(), ".tff", "settings.yaml");
    if (!existsSync(settingsPath)) {
        return false; // Default to enabled if no settings file
    }
    try {
        const content = readFileSync(settingsPath, "utf8");
        // Use loadProjectSettings for proper Zod validation - no type casts needed
        const settings = loadProjectSettings(content);
        return settings.workflow?.reminders === false;
    }
    catch {
        return false; // On any error, default to enabled
    }
}
/**
 * Check if the project is initialized (has .tff directory).
 */
function isProjectInitialized() {
    const tffDir = path.join(process.cwd(), ".tff");
    return existsSync(tffDir);
}
export const sessionRemindCmd = async (_args) => {
    // Fast path: check if reminders are disabled
    if (areRemindersDisabled()) {
        return JSON.stringify({
            ok: true,
            data: { reminder: null },
        });
    }
    // Check if project is initialized
    if (!isProjectInitialized()) {
        return JSON.stringify({
            ok: true,
            data: { reminder: null },
        });
    }
    const result = await withBranchGuard(async (stores) => {
        try {
            const reminder = generateReminder(stores);
            return JSON.stringify({
                ok: true,
                data: { reminder },
            });
        }
        catch (err) {
            return JSON.stringify({
                ok: false,
                error: {
                    code: "REMINDER_GENERATION_FAILED",
                    message: err instanceof Error ? err.message : String(err),
                },
            });
        }
    });
    // withBranchGuard can return a string directly (for BRANCH_MISMATCH errors)
    // or the result of the callback. If it's already a string, return it.
    if (typeof result === "string") {
        return result;
    }
    // This should not happen as the callback always returns a string,
    // but handle it defensively
    return result;
};
//# sourceMappingURL=session-remind.cmd.js.map