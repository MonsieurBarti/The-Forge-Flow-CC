import { join } from "node:path";
import { listMilestones } from "../../application/milestone/list-milestones.js";
import { reconcileState } from "../../application/reconcile/reconcile-state.js";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import type { CommandSchema } from "../utils/flag-parser.js";

export const milestoneListSchema: CommandSchema = {
	name: "milestone:list",
	purpose: "List all milestones",
	requiredFlags: [],
	optionalFlags: [],
	examples: ["milestone:list"],
};

export const milestoneListCmd = async (args: string[]): Promise<string> => {
	// Check for --help flag
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: milestoneListSchema.name,
				purpose: milestoneListSchema.purpose,
				syntax: milestoneListSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: milestoneListSchema.examples,
			},
		});
	}

	const { milestoneStore, sliceStore, taskStore } = createClosableStateStoresUnchecked();
	const result = await listMilestones({ milestoneStore });

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
