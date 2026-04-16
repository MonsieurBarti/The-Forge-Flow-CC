import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { detectSpecEdit } from "../../application/guard/detect-spec-edit.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

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

export const specEditGuardSchema: CommandSchema = {
	name: "spec-edit:guard",
	purpose: "Check for spec file edits outside proper workflow",
	requiredFlags: [],
	optionalFlags: [],
	examples: ["spec-edit:guard"],
};

export const specEditGuardCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, specEditGuardSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	// Get file path from parsed data (optional)
	const filePath = parsed.data["file-path"] as string | undefined ?? null;

	// Fast path: check if guards are disabled
	if (areGuardsDisabled()) {
		return JSON.stringify({
			ok: true,
			data: { warning: null },
		});
	}

	// Check if project is initialized
	if (!isProjectInitialized()) {
		return JSON.stringify({
			ok: true,
			data: { warning: null },
		});
	}

	// If no file path provided, return null warning (malformed input handling)
	if (!filePath) {
		return JSON.stringify({
			ok: true,
			data: { warning: null },
		});
	}

	try {
		const detectResult = detectSpecEdit(filePath);

		// Return warning message if present, otherwise null
		const warning = detectResult.warning?.message ?? null;

		return JSON.stringify({
			ok: true,
			data: { warning },
		});
	} catch (err) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "GUARD_CHECK_FAILED",
				message: err instanceof Error ? err.message : String(err),
			},
		});
	}
};
