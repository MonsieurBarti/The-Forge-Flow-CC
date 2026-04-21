import { createWorktreeUseCase } from "../../application/worktree/create-worktree.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import {
	createTffCcSymlink,
	getProjectId,
	writeProjectIdFile,
} from "../../infrastructure/home-directory.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const worktreeCreateSchema: CommandSchema = {
	name: "worktree:create",
	purpose: "Create a git worktree for a slice",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to create worktree for (UUID or label format)",
			pattern:
				"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|M\\d+-S\\d+)$",
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

	const { "slice-id": sliceLabel } = parsed.data as { "slice-id": string };

	const cwd = process.cwd();
	const gitOps = new GitCliAdapter(cwd);

	const closableStores = createClosableStateStoresUnchecked();
	const { sliceStore, milestoneStore } = closableStores;

	try {
		const resolvedSlice = resolveSliceId(sliceLabel, sliceStore);
		if (!resolvedSlice.ok) {
			return JSON.stringify({ ok: false, error: resolvedSlice.error });
		}
		const sliceId = resolvedSlice.data;

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

		const startPoint = milestone.branch;

		const result = await createWorktreeUseCase(
			{ slice, milestoneNumber: milestone.number, startPoint },
			{ gitOps },
		);
		if (isOk(result)) {
			const projectId = getProjectId(cwd);
			const worktreePath = result.data.worktreePath;
			createTffCcSymlink(worktreePath, projectId);
			// Persist the project id in the new worktree so subsequent tff-tools commands
			// run inside it don't mint a fresh one (e.g. when the branch's HEAD predates
			// the commit that added .tff-project-id).
			writeProjectIdFile(worktreePath, projectId);

			return JSON.stringify({ ok: true, data: result.data });
		}
		return JSON.stringify({ ok: false, error: result.error });
	} finally {
		closableStores.close();
	}
};
