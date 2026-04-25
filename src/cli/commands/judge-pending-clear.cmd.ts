import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const judgePendingClearSchema: CommandSchema = {
	name: "judge:pending:clear",
	purpose: "Drop a pending-judgment marker (use when a slice was already judged)",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (M##-S## or UUID)",
		},
	],
	optionalFlags: [],
	examples: ["judge:pending:clear --slice-id M01-S02"],
};

export const judgePendingClearCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, judgePendingClearSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { "slice-id": raw } = parsed.data as { "slice-id": string };

	const stores = createClosableStateStoresUnchecked();
	try {
		const resolved = resolveSliceId(raw, stores.sliceStore);
		if (!resolved.ok) return JSON.stringify({ ok: false, error: resolved.error });
		const r = stores.pendingJudgmentStore.clearPending(resolved.data);
		if (!r.ok) return JSON.stringify({ ok: false, error: r.error });
		return JSON.stringify({ ok: true, data: { slice_id: resolved.data } });
	} finally {
		stores.close();
	}
};
