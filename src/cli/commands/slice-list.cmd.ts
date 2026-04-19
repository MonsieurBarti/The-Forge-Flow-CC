import { join } from "node:path";
import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { reconcileState } from "../../application/reconcile/reconcile-state.js";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceListSchema: CommandSchema = {
	name: "slice:list",
	purpose: "List all slices, optionally filtered by milestone",
	requiredFlags: [],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Filter by milestone UUID or M-label (e.g., M01)",
		},
	],
	examples: ["slice:list", "slice:list --milestone-id M01", "slice:list --milestone-id <uuid>"],
};

export const sliceListCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceListSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": rawMilestoneId } = parsed.data as { "milestone-id"?: string };

	const { milestoneStore, sliceStore, taskStore } = createClosableStateStoresUnchecked();

	let milestoneId: string | undefined;
	if (rawMilestoneId) {
		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}
		milestoneId = resolved.data;
	}

	const result = sliceStore.listSlices(milestoneId);

	// Reconcile STATE.md against DB-derived render. Non-fatal: never blocks the read.
	try {
		const activeMR = milestoneStore.listMilestones();
		if (activeMR.ok) {
			const active = activeMR.data.find((m) => m.status !== "closed");
			if (active) {
				await reconcileState({
					stateMdPath: join(process.cwd(), ".tff-cc", "STATE.md"),
					renderStateMd: async () => {
						const r = renderStateMd(
							{ milestoneId: active.id },
							{ milestoneStore, sliceStore, taskStore },
						);
						if (!r.ok) throw new Error(r.error.message);
						return r.data;
					},
				});
			}
		}
	} catch {
		// Intentionally swallowed: reconcile must never fail a read.
	}

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
