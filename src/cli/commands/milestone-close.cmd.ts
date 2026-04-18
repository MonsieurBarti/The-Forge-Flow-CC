import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
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
			description: "Milestone UUID or M-label (e.g., M01) to close",
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
		"milestone:close --milestone-id <uuid>",
		'milestone:close --milestone-id M01 --reason "Completed"',
	],
};

export const milestoneCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": rawMilestoneId, reason } = parsed.data as {
		"milestone-id": string;
		reason?: string;
	};

	const { milestoneStore } = createClosableStateStoresUnchecked();

	const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
	if (!isOk(resolved)) {
		return JSON.stringify({ ok: false, error: resolved.error });
	}

	const result = milestoneStore.closeMilestone(resolved.data, reason);
	if (isOk(result)) return JSON.stringify({ ok: true, data: { status: "closed", reason } });
	return JSON.stringify({ ok: false, error: result.error });
};
