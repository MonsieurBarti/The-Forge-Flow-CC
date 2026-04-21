import { nextWorkflow, suggestedCommand } from "../../application/lifecycle/chain-workflow.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const workflowNextSchema: CommandSchema = {
	name: "workflow:next",
	purpose: "Get the next workflow status and suggested /tff command from current status",
	mutates: false,
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

	return JSON.stringify({
		ok: true,
		data: {
			next: nextWorkflow(status),
			suggested: suggestedCommand(status),
		},
	});
};
