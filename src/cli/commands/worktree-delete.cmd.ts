import { deleteWorktreeUseCase } from "../../application/worktree/delete-worktree.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const worktreeDeleteSchema: CommandSchema = {
	name: "worktree:delete",
	purpose: "Delete a git worktree for a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to delete worktree for",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [],
	examples: ["worktree:delete --slice-id M01-S01"],
};

export const worktreeDeleteCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, worktreeDeleteSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId } = parsed.data as { "slice-id": string };

	const gitOps = new GitCliAdapter(process.cwd());
	const result = await deleteWorktreeUseCase({ sliceId }, { gitOps });
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
