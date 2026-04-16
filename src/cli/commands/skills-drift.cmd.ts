import { checkDrift } from "../../application/skills/check-drift.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const skillsDriftSchema: CommandSchema = {
	name: "skills:drift",
	purpose: "Check for drift between original and current content",
	requiredFlags: [
		{
			name: "original",
			type: "string",
			description: "Original content",
		},
		{
			name: "current",
			type: "string",
			description: "Current content",
		},
	],
	optionalFlags: [],
	examples: ["skills:drift --original 'old content' --current 'new content'"],
};

export const skillsDriftCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, skillsDriftSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { original, current } = parsed.data as { original: string; current: string };

	const result = checkDrift(original, current);
	return JSON.stringify({ ok: true, data: result });
};
