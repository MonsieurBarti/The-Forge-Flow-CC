import { extractNgrams } from "../../application/patterns/extract-ngrams.js";
import { isOk } from "../../domain/result.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
import type { CommandSchema } from "../utils/flag-parser.js";

export const patternsExtractSchema: CommandSchema = {
	name: "patterns:extract",
	purpose: "Extract patterns from observations",
	requiredFlags: [],
	optionalFlags: [],
	examples: ["patterns:extract"],
};

export const patternsExtractCmd = async (args: string[]): Promise<string> => {
	// Check for --help flag
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: patternsExtractSchema.name,
				purpose: patternsExtractSchema.purpose,
				syntax: patternsExtractSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: patternsExtractSchema.examples,
			},
		});
	}

	const store = new JsonlStoreAdapter(".tff-cc/observations");
	const obsResult = await store.readObservations();
	if (!isOk(obsResult)) return JSON.stringify({ ok: false, error: obsResult.error });
	const bigrams = extractNgrams(obsResult.data, 2);
	const trigrams = extractNgrams(obsResult.data, 3);
	const all = [...bigrams, ...trigrams];
	// Persist extracted patterns so aggregate can read them
	await store.writePatterns(all);
	return JSON.stringify({ ok: true, data: all });
};
