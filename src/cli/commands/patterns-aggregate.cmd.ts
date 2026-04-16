import { aggregatePatterns } from "../../application/patterns/aggregate-patterns.js";
import { isOk } from "../../domain/result.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const patternsAggregateSchema: CommandSchema = {
	name: "patterns:aggregate",
	purpose: "Aggregate patterns by frequency",
	requiredFlags: [],
	optionalFlags: [
		{
			name: "min-count",
			type: "number",
			description: "Minimum count threshold (default: 3)",
		},
	],
	examples: ["patterns:aggregate", "patterns:aggregate --min-count 5"],
};

export const patternsAggregateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, patternsAggregateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const minCount = (parsed.data["min-count"] as number | undefined) ?? 3;

	const store = new JsonlStoreAdapter(".tff/observations");
	const patternsResult = await store.readPatterns();
	if (!isOk(patternsResult)) return JSON.stringify({ ok: false, error: patternsResult.error });
	const result = aggregatePatterns(patternsResult.data, { minCount });
	await store.writePatterns(result);
	return JSON.stringify({ ok: true, data: result });
};
