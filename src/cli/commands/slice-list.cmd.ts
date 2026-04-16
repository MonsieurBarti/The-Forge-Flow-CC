import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const sliceListSchema: CommandSchema = {
	name: "slice:list",
	purpose: "List all slices, optionally filtered by milestone",
	requiredFlags: [],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Filter by milestone ID",
			pattern: "^M\\d+$",
		},
	],
	examples: ["slice:list", "slice:list --milestone-id M01"],
};

export const sliceListCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceListSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": milestoneId } = parsed.data as { "milestone-id"?: string };

	const { sliceStore } = createClosableStateStoresUnchecked();
	const result = sliceStore.listSlices(milestoneId);
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
