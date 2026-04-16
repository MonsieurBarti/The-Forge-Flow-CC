import { createWorktreeUseCase } from "../../application/worktree/create-worktree.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const worktreeCreateSchema: CommandSchema = {
	name: "worktree:create",
	purpose: "Create a git worktree for a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to create worktree for (UUID or label format)",
			pattern: "^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|M\\d+-S\\d+)$",
		},
	],
	optionalFlags: [],
	examples: [
		"worktree:create --slice-id M01-S01",
		"worktree:create --slice-id 12345678-abcd-ef01-2345-67890abcdef0",
	],
};

export const worktreeCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, worktreeCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId } = parsed.data as { "slice-id": string };

	const cwd = process.cwd();
	const gitOps = new GitCliAdapter(cwd);

	// Fetch slice and milestone from store
	const { sliceStore, milestoneStore } = createClosableStateStoresUnchecked();
	const sliceResult = sliceStore.getSlice(sliceId);
	if (!isOk(sliceResult) || !sliceResult.data) {
		return JSON.stringify({
			ok: false,
			error: { code: "NOT_FOUND", message: `Slice ${sliceId} not found` },
		});
	}
	const slice = sliceResult.data;

	const milestoneResult = milestoneStore.getMilestone(slice.milestoneId);
	if (!isOk(milestoneResult) || !milestoneResult.data) {
		return JSON.stringify({
			ok: false,
			error: { code: "NOT_FOUND", message: `Milestone ${slice.milestoneId} not found` },
		});
	}
	const milestone = milestoneResult.data;

	// Start from the milestone branch
	const startPoint = milestone.branch;

	const result = await createWorktreeUseCase(
		{ slice, milestoneNumber: milestone.number, startPoint },
		{ gitOps },
	);
	if (isOk(result)) {
		return JSON.stringify({ ok: true, data: result.data });
	}
	return JSON.stringify({ ok: false, error: result.error });
};
