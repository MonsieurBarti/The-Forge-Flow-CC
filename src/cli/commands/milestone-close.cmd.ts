import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const milestoneCloseSchema: CommandSchema = {
	name: "milestone:close",
	purpose: "Close a milestone",
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone ID to close",
			pattern: "^M\\d+$",
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
		"milestone:close --milestone-id M01",
		'milestone:close --milestone-id M01 --reason "Completed"',
	],
};

export const milestoneCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": milestoneId, reason } = parsed.data as {
		"milestone-id": string;
		reason?: string;
	};

	const { milestoneStore } = createClosableStateStoresUnchecked();
	const result = milestoneStore.closeMilestone(milestoneId, reason);
	if (isOk(result)) return JSON.stringify({ ok: true, data: { status: "closed", reason } });
	return JSON.stringify({ ok: false, error: result.error });
};
