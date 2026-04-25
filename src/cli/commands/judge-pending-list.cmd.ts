import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";

export const judgePendingListSchema: CommandSchema = {
	name: "judge:pending:list",
	purpose: "List slices closed without a recorded routing judgment",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Limit to slices under a milestone (M## or UUID)",
		},
	],
	examples: ["judge:pending:list", "judge:pending:list --milestone-id M01"],
};

interface PendingListEntry {
	slice_id: string;
	slice_label: string;
	milestone_id: string;
	milestone_label: string;
	created_at: string;
}

export const judgePendingListCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, judgePendingListSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { "milestone-id": rawMilestoneId } = parsed.data as { "milestone-id"?: string };

	const stores = createClosableStateStoresUnchecked();
	try {
		const { pendingJudgmentStore, sliceStore, milestoneStore } = stores;

		let milestoneFilter: string | null = null;
		if (rawMilestoneId) {
			const r = resolveMilestoneId(rawMilestoneId, milestoneStore);
			if (!r.ok) return JSON.stringify({ ok: false, error: r.error });
			milestoneFilter = r.data;
		}

		const pendingRes = milestoneFilter
			? pendingJudgmentStore.listPendingForMilestone(milestoneFilter)
			: pendingJudgmentStore.listPending();
		if (!pendingRes.ok) return JSON.stringify({ ok: false, error: pendingRes.error });

		const entries: PendingListEntry[] = [];
		for (const p of pendingRes.data) {
			const slice = sliceStore.getSlice(p.sliceId);
			if (!slice.ok || !slice.data) continue;
			const milestone = milestoneStore.getMilestone(slice.data.milestoneId);
			if (!milestone.ok || !milestone.data) continue;
			const milestoneLabel = `M${String(milestone.data.number).padStart(2, "0")}`;
			const sliceLabel = `${milestoneLabel}-S${String(slice.data.number).padStart(2, "0")}`;
			entries.push({
				slice_id: p.sliceId,
				slice_label: sliceLabel,
				milestone_id: milestone.data.id,
				milestone_label: milestoneLabel,
				created_at: p.createdAt,
			});
		}

		return JSON.stringify({ ok: true, data: { pending: entries, count: entries.length } });
	} finally {
		stores.close();
	}
};
