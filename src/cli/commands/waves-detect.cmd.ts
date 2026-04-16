import { detectWaves } from "../../application/waves/detect-waves.js";
import { isOk } from "../../domain/result.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const wavesDetectSchema: CommandSchema = {
	name: "waves:detect",
	purpose: "Detect execution waves from task dependencies",
	requiredFlags: [
		{
			name: "tasks",
			type: "json",
			description: "JSON array of tasks with id and dependsOn fields",
		},
	],
	optionalFlags: [],
	examples: [
		'waves:detect --tasks \'[{"id":"T01","dependsOn":[]},{"id":"T02","dependsOn":["T01"]}]\'',
	],
};

export const wavesDetectCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, wavesDetectSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { tasks } = parsed.data as { tasks: unknown };

	if (
		!Array.isArray(tasks) ||
		!tasks.every((t) => typeof t?.id === "string" && Array.isArray(t?.dependsOn))
	) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_ARGS",
				message: "Each task must have { id: string, dependsOn: string[] }",
			},
		});
	}
	const result = detectWaves(tasks);
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
