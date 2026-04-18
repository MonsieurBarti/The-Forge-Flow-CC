import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";
import { withSyncLock } from "../with-sync-lock.js";

export const syncStateSchema: CommandSchema = {
	name: "sync:state",
	purpose: "Synchronize STATE.md for a milestone",
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone ID (display label e.g. M01 or UUID)",
			pattern: "^(M\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
		},
	],
	optionalFlags: [],
	examples: ["sync:state --milestone-id M01", "sync:state --milestone-id <uuid>"],
};

export const syncStateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, syncStateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": milestoneLabel } = parsed.data as { "milestone-id": string };

	const result = await withSyncLock(async () => {
		const stores = createClosableStateStoresUnchecked();
		const { milestoneStore, sliceStore, taskStore } = stores;

		const resolvedId = resolveMilestoneId(milestoneLabel, milestoneStore);
		if (!resolvedId.ok) return JSON.stringify({ ok: false, error: resolvedId.error });

		const artifactStore = new MarkdownArtifactAdapter(process.cwd());
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
