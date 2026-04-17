import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export interface SpecEditWarning {
	code: "SPEC_EDIT_DETECTED";
	message: string;
	suggestion: string;
}

export interface DetectSpecEditResult {
	warning: SpecEditWarning | null;
	reason: "GUARD_DISABLED" | "NOT_SPEC_FILE" | "SPEC_EDIT_DETECTED" | null;
}

/**
 * Check if direct-edit guards are disabled in settings.yaml.
 * Returns true if workflow.guards is explicitly false.
 */
function areGuardsDisabled(): boolean {
	const settingsPath = path.join(process.cwd(), ".tff-cc", "settings.yaml");
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
 * Check if a file path matches SPEC.md (case-insensitive).
 * Matches: SPEC.md, spec.md, Spec.md, sPeC.md, etc.
 * Also matches paths like .tff-cc/milestones/M001/SPEC.md or slices/S01/SPEC.md
 */
function isSpecFile(filePath: string): boolean {
	if (!filePath || typeof filePath !== "string") {
		return false;
	}

	// Normalize path separators
	const normalized = filePath.replace(/\\/g, "/");

	// Get the basename and remove any query/hash fragments
	const basename = normalized.split("/").pop() || "";
	const cleanName = basename.split("?")[0].split("#")[0];

	// Case-insensitive match for spec.md (exact match only, no extensions like .backup)
	return cleanName.toLowerCase() === "spec.md";
}

/**
 * Detect if a file path is a SPEC.md edit outside the proper /tff:discuss workflow.
 *
 * Checks:
 * 1. If guards are disabled → return null (no warning)
 * 2. If path is not a SPEC.md file → return null (no warning)
 * 3. Path is SPEC.md → return warning with suggestion to use /tff:discuss
 *
 * @param filePath - The file path to check
 * @returns DetectSpecEditResult with warning and reason code
 */
export function detectSpecEdit(filePath: string): DetectSpecEditResult {
	// Fast path: check if guards are disabled
	if (areGuardsDisabled()) {
		return {
			warning: null,
			reason: "GUARD_DISABLED",
		};
	}

	// Check if path is a SPEC.md file
	if (!isSpecFile(filePath)) {
		return {
			warning: null,
			reason: "NOT_SPEC_FILE",
		};
	}

	// SPEC.md edit detected outside /tff:discuss workflow
	return {
		warning: {
			code: "SPEC_EDIT_DETECTED",
			message: "SPEC.md modified outside workflow — update STATE.md?",
			suggestion: "Use /tff:discuss for phase boundary changes, or add manual state-update entry.",
		},
		reason: "SPEC_EDIT_DETECTED",
	};
}
