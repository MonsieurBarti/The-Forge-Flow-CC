import { nextWorkflow } from "../../application/lifecycle/chain-workflow.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const workflowNextSchema: CommandSchema = {
	name: "workflow:next",
	purpose: "Get the next workflow status from current status",
	requiredFlags: [
		{
			name: "status",
			type: "string",
			description: "Current status",
		},
	],
	optionalFlags: [],
	examples: ["workflow:next --status planning"],
};

export const workflowNextCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, workflowNextSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { status } = parsed.data as { status: string };

	return JSON.stringify({ ok: true, data: { next: nextWorkflow(status) } });
};
