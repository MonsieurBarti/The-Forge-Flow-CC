import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { detectDirectEdit } from "../../application/guard/detect-direct-edit.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { resolveRepoRoot } from "../../infrastructure/home-directory.js";
import { SETTINGS_FILE, TFF_CC_DIR } from "../../shared/paths.js";
import type { CommandSchema } from "../utils/flag-parser.js";

/**
 * Check if direct-edit guards are disabled in settings.yaml.
 * Returns true if workflow.guards is explicitly false.
 */
function areGuardsDisabled(): boolean {
	const repoRoot = resolveRepoRoot(process.cwd());
	const settingsPath = path.join(repoRoot, SETTINGS_FILE);
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
 * Check if the project is initialized (has .tff-cc directory).
 */
function isProjectInitialized(): boolean {
	const tffDir = path.join(resolveRepoRoot(process.cwd()), TFF_CC_DIR);
	return existsSync(tffDir);
}

export const directEditGuardSchema: CommandSchema = {
	name: "direct-edit:guard",
	purpose: "Check for direct edits without proper workflow",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["direct-edit:guard"],
};

export const directEditGuardCmd = async (args: string[]): Promise<string> => {
	// Check for --help flag
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: directEditGuardSchema.name,
				purpose: directEditGuardSchema.purpose,
				syntax: directEditGuardSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: directEditGuardSchema.examples,
			},
		});
	}

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

	try {
		const { sessionStore, taskStore } = createClosableStateStoresUnchecked();
		const detectResult = detectDirectEdit({
			sessionStore,
			taskStore,
		});

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
