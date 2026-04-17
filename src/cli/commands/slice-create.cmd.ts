import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { createSliceUseCase } from "../../application/slice/create-slice.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceCreateSchema: CommandSchema = {
	name: "slice:create",
	purpose: "Create a new slice in a milestone",
	requiredFlags: [
		{
			name: "title",
			type: "string",
			description: "Title for the new slice",
		},
	],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) — auto-detected if not provided",
		},
	],
	examples: [
		'slice:create --title "Implement feature X"',
		'slice:create --title "Fix bug Y" --milestone-id M01',
		'slice:create --title "Fix bug Y" --milestone-id <uuid>',
	],
};

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { title, "milestone-id": explicitMilestoneId } = parsed.data as {
		title: string;
		"milestone-id"?: string;
	};

	const cwd = process.cwd();
	const { milestoneStore, sliceStore } = createClosableStateStoresUnchecked();
	const artifactStore = new MarkdownArtifactAdapter(cwd);
	const _gitOps = new GitCliAdapter(cwd);

	let milestoneId: string;

	if (explicitMilestoneId) {
		const resolved = resolveMilestoneId(milestoneStore, explicitMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}
		milestoneId = resolved.data;
	} else {
		// Auto-detect active milestone (most recent open one)
		const milestonesResult = milestoneStore.listMilestones();
		if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: "No milestone found. Run /tff:new-milestone first." },
			});
		}
		// Use the last open milestone, or the last one if none are open
		const openMilestones = milestonesResult.data.filter((m) => m.status !== "closed");
		const milestone =
			openMilestones.length > 0
				? openMilestones[openMilestones.length - 1]
				: milestonesResult.data[milestonesResult.data.length - 1];
		milestoneId = milestone.id;
	}

	const result = await createSliceUseCase(
		{ milestoneId, title: title },
		{ milestoneStore, sliceStore, artifactStore },
	);

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
