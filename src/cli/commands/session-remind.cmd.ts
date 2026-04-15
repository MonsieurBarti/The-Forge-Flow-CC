import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { generateReminder } from "../../application/session/generate-reminder.js";
import { loadProjectSettings } from "../../domain/value-objects/project-settings.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

/**
 * Check if reminders are disabled in settings.yaml.
 * Returns true if workflow.reminders is explicitly false.
 */
function areRemindersDisabled(): boolean {
	const settingsPath = path.join(process.cwd(), ".tff", "settings.yaml");
	if (!existsSync(settingsPath)) {
		return false; // Default to enabled if no settings file
	}
	try {
		const content = readFileSync(settingsPath, "utf8");
		// Use loadProjectSettings for proper Zod validation - no type casts needed
		const settings = loadProjectSettings(content);
		return settings.workflow?.reminders === false;
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

export const sessionRemindCmd = async (_args: string[]): Promise<string> => {
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

	try {
		const stores = createClosableStateStoresUnchecked();
		const reminder = generateReminder(stores);
		return JSON.stringify({
			ok: true,
			data: { reminder },
		});
	} catch (err) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "REMINDER_GENERATION_FAILED",
				message: err instanceof Error ? err.message : String(err),
			},
		});
	}
};
