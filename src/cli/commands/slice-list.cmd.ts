import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { reconcileOnRead } from "../../application/reconcile/reconcile-on-read.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceListSchema: CommandSchema = {
	name: "slice:list",
	purpose: "List all slices, optionally filtered by milestone or kind",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Filter by milestone UUID or M-label (e.g., M01)",
		},
		{
			name: "kind",
			type: "string",
			description: "Filter by slice kind: milestone, quick, or debug",
			enum: ["milestone", "quick", "debug"],
		},
		{
			name: "include-archived",
			type: "boolean",
			description: "Include archived slices (default: hidden)",
		},
	],
	examples: [
		"slice:list",
		"slice:list --milestone-id M01",
		"slice:list --milestone-id <uuid>",
		"slice:list --kind quick",
		"slice:list --kind debug",
		"slice:list --kind milestone",
		"slice:list --include-archived",
	],
};

export const sliceListCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceListSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		"milestone-id": rawMilestoneId,
		kind,
		"include-archived": includeArchived,
	} = parsed.data as {
		"milestone-id"?: string;
		kind?: "milestone" | "quick" | "debug";
		"include-archived"?: boolean;
	};

	if (rawMilestoneId && kind && kind !== "milestone") {
		return JSON.stringify({
			ok: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "--milestone-id and --kind are mutually exclusive (unless --kind=milestone)",
			},
		});
	}

	const { milestoneStore, sliceStore, taskStore } = createClosableStateStoresUnchecked();

	let milestoneId: string | undefined;
	if (rawMilestoneId) {
		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}
		milestoneId = resolved.data;
	}

	const result = kind
		? sliceStore.listSlicesByKind(kind, { includeArchived: includeArchived === true })
		: sliceStore.listSlices({ milestoneId, includeArchived: includeArchived === true });

	await reconcileOnRead(process.cwd(), { milestoneStore, sliceStore, taskStore });

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
