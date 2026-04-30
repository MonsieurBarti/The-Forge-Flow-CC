import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";
import { withClosableSyncLock } from "../with-sync-lock.js";

export const syncStateSchema: CommandSchema = {
	name: "sync:state",
	purpose: "Synchronize STATE.md for a milestone or kind (quick/debug)",
	mutates: true,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone ID (M## or UUID) — exactly one of --milestone-id or --kind required",
			pattern:
				"^(M\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
		},
		{
			name: "kind",
			type: "string",
			description: "Sync per-kind STATE.md: quick or debug",
			enum: ["quick", "debug"],
		},
	],
	examples: ["sync:state --milestone-id M01", "sync:state --kind quick", "sync:state --kind debug"],
};

export const syncStateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, syncStateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": milestoneLabel, kind } = parsed.data as {
		"milestone-id"?: string;
		kind?: "quick" | "debug";
	};

	const hasMilestone = !!milestoneLabel;
	const hasKind = !!kind;
	if (hasMilestone === hasKind) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "Exactly one of --milestone-id or --kind must be provided",
			},
		});
	}

	const result = await withClosableSyncLock(async (stores) => {
		const { milestoneStore, sliceStore, taskStore } = stores;
		const artifactStore = new MarkdownArtifactAdapter(process.cwd());

		if (hasKind && kind) {
			const syncResult = await generateState(
				{ scope: "kind", kind },
				{ milestoneStore, sliceStore, taskStore, artifactStore },
			);
			if (isOk(syncResult)) return JSON.stringify({ ok: true, data: null });
			return JSON.stringify({ ok: false, error: syncResult.error });
		}

		// hasMilestone branch
		const resolvedId = resolveMilestoneId(milestoneLabel as string, milestoneStore);
		if (!resolvedId.ok) return JSON.stringify({ ok: false, error: resolvedId.error });

		const syncResult = await generateState(
			{ milestoneId: resolvedId.data },
			{ milestoneStore, sliceStore, taskStore, artifactStore },
		);
		if (isOk(syncResult)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: syncResult.error });
	});
	if (typeof result === "string") return result;
	return JSON.stringify(result);
};
