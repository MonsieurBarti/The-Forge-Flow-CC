import { sliceLabelFor } from "../../domain/helpers/branch-naming.js";
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
		{
			name: "kind",
			type: "string",
			description: "Filter by slice kind",
			enum: ["milestone", "quick", "debug", "all"],
		},
	],
	examples: [
		"judge:pending:list",
		"judge:pending:list --milestone-id M01",
		"judge:pending:list --kind quick",
	],
};

interface PendingListEntry {
	slice_id: string;
	slice_label: string;
	slice_kind: "milestone" | "quick" | "debug";
	milestone_id: string | null;
	milestone_label: string | null;
	created_at: string;
}

export const judgePendingListCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, judgePendingListSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { "milestone-id": rawMilestoneId, kind: rawKind } = parsed.data as {
		"milestone-id"?: string;
		kind?: "milestone" | "quick" | "debug" | "all";
	};

	const kindFilter = rawKind ?? "all";

	// Reject incompatible combo: --milestone-id with --kind quick|debug.
	if (rawMilestoneId && (kindFilter === "quick" || kindFilter === "debug")) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "VALIDATION_ERROR",
				message: `--milestone-id is incompatible with --kind ${kindFilter}; ad-hoc slices have no milestone.`,
			},
		});
	}

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

			// Post-filter by kind when requested (and not already milestone-filtered).
			if (kindFilter !== "all" && slice.data.kind !== kindFilter) continue;

			let milestoneLabel: string | null = null;
			let milestoneId: string | null = null;
			let milestoneForLabel: { number: number } | undefined;
			if (slice.data.milestoneId) {
				const milestone = milestoneStore.getMilestone(slice.data.milestoneId);
				if (!milestone.ok || !milestone.data) continue;
				milestoneId = milestone.data.id;
				milestoneLabel = `M${String(milestone.data.number).padStart(2, "0")}`;
				milestoneForLabel = { number: milestone.data.number };
			}

			let label: string;
			try {
				label = sliceLabelFor(slice.data, milestoneForLabel);
			} catch {
				continue;
			}

			entries.push({
				slice_id: p.sliceId,
				slice_label: label,
				slice_kind: slice.data.kind,
				milestone_id: milestoneId,
				milestone_label: milestoneLabel,
				created_at: p.createdAt,
			});
		}

		return JSON.stringify({ ok: true, data: { pending: entries, count: entries.length } });
	} finally {
		stores.close();
	}
};
