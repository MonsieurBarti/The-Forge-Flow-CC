import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { withSyncLock } from "../with-sync-lock.js";

export const syncStateSchema: CommandSchema = {
	name: "sync:state",
	purpose: "Synchronize STATE.md for a milestone",
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) to sync",
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

	const { "milestone-id": rawMilestoneId } = parsed.data as { "milestone-id": string };

	const result = await withSyncLock(async () => {
		const { milestoneStore, sliceStore, taskStore } = createClosableStateStoresUnchecked();

		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}

		const artifactStore = new MarkdownArtifactAdapter(process.cwd());
		const result = await generateState(
			{ milestoneId: resolved.data },
			{ milestoneStore, sliceStore, taskStore, artifactStore },
		);
		if (isOk(result)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: result.error });
	});
	// If result is a string, it came from the inner function; otherwise it's a SyncLockResult
	if (typeof result === "string") return result;
	return JSON.stringify(result);
};
