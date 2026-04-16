import { shouldAutoTransition } from "../../application/lifecycle/chain-workflow.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const workflowShouldAutoSchema: CommandSchema = {
	name: "workflow:should-auto",
	purpose: "Check if automatic transition is allowed for a status and mode",
	requiredFlags: [
		{
			name: "status",
			type: "string",
			description: "Current status",
		},
		{
			name: "mode",
			type: "string",
			description: "Workflow mode",
			enum: ["guided", "plan-to-pr"],
		},
	],
	optionalFlags: [],
	examples: ["workflow:should-auto --status planning --mode guided"],
};

export const workflowShouldAutoCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, workflowShouldAutoSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { status, mode } = parsed.data as { status: string; mode: string };

	return JSON.stringify({
		ok: true,
		data: { autoTransition: shouldAutoTransition(status, mode as "guided" | "plan-to-pr") },
	});
};
