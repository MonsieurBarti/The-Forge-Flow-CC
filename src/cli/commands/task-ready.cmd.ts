import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const taskReadySchema: CommandSchema = {
	name: "task:ready",
	purpose: "List ready tasks for a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to list ready tasks for",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [],
	examples: ["task:ready --slice-id M01-S01"],
};

export const taskReadyCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, taskReadySchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId } = parsed.data as { "slice-id": string };

	const { taskStore } = createClosableStateStoresUnchecked();
	const result = taskStore.listReadyTasks(sliceId);
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
