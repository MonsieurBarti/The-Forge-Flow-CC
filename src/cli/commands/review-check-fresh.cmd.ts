import { enforceFreshReviewer } from "../../application/review/enforce-fresh-reviewer.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const reviewCheckFreshSchema: CommandSchema = {
	name: "review:check-fresh",
	purpose: "Check if a reviewer is fresh for a slice",
	mutates: false,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "agent",
			type: "string",
			description: "Agent identity to check",
		},
	],
	optionalFlags: [],
	examples: ["review:check-fresh --slice-id M01-S01 --agent reviewer"],
};

export const reviewCheckFreshCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, reviewCheckFreshSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId, agent } = parsed.data as {
		"slice-id": string;
		agent: string;
	};

	const { taskStore, reviewStore } = createClosableStateStoresUnchecked();
	const result = await enforceFreshReviewer(
		{ sliceId, reviewerAgent: agent },
		{ taskStore, reviewStore },
	);
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
