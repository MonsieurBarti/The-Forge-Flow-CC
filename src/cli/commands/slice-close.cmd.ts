import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceCloseSchema: CommandSchema = {
	name: "slice:close",
	purpose: "Close a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to close",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [
		{
			name: "reason",
			type: "string",
			description: "Reason for closing",
		},
	],
	examples: [
		"slice:close --slice-id M01-S01",
		'slice:close --slice-id M01-S01 --reason "Completed"',
	],
};

export const sliceCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId, reason } = parsed.data as {
		"slice-id": string;
		reason?: string;
	};

	const { sliceStore } = createClosableStateStoresUnchecked();
	// Transition to closed via the normal transition path
	const result = sliceStore.transitionSlice(sliceId, "closed");
	if (isOk(result)) return JSON.stringify({ ok: true, data: { status: "closed", reason } });
	return JSON.stringify({ ok: false, error: result.error });
};
