import { shouldAutoTransition } from "../../application/lifecycle/chain-workflow.js";

export const workflowShouldAutoCmd = async (args: string[]): Promise<string> => {
	const [status, mode] = args;
	if (!status || !mode)
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: "Usage: workflow:should-auto <status> <mode>" },
		});
	return JSON.stringify({
		ok: true,
		data: { autoTransition: shouldAutoTransition(status, mode as "guided" | "plan-to-pr") },
	});
};
