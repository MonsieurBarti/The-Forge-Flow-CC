import { rankCandidates } from "../../application/patterns/rank-candidates.js";
import { isOk } from "../../domain/result.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const patternsRankSchema: CommandSchema = {
	name: "patterns:rank",
	purpose: "Rank pattern candidates by score",
	requiredFlags: [],
	optionalFlags: [
		{
			name: "threshold",
			type: "number",
			description: "Minimum score threshold (default: 0.5)",
		},
	],
	examples: ["patterns:rank", "patterns:rank --threshold 0.7"],
};

export const patternsRankCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, patternsRankSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const threshold = (parsed.data.threshold as number | undefined) ?? 0.5;

	const store = new JsonlStoreAdapter(".tff-cc/observations");
	const patternsResult = await store.readPatterns();
	if (!isOk(patternsResult)) return JSON.stringify({ ok: false, error: patternsResult.error });
	const obsResult = await store.readObservations();
	const totalSessions = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.session)).size : 1;
	const totalProjects = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.project)).size : 1;
	const candidates = rankCandidates(patternsResult.data, {
		totalProjects,
		totalSessions,
		now: new Date().toISOString().slice(0, 10),
		threshold,
	});
	await store.writeCandidates(candidates);
	return JSON.stringify({ ok: true, data: candidates });
};
