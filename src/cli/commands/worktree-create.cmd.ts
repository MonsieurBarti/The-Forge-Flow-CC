import path from "node:path";
import { createWorktreeUseCase } from "../../application/worktree/create-worktree.js";
import { isOk } from "../../domain/result.js";
import { copyTffToWorktree } from "../../infrastructure/adapters/git/copy-tff-to-worktree.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const worktreeCreateSchema: CommandSchema = {
	name: "worktree:create",
	purpose: "Create a git worktree for a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to create worktree for",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [],
	examples: ["worktree:create --slice-id M01-S01"],
};

export const worktreeCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, worktreeCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId } = parsed.data as { "slice-id": string };

	const cwd = process.cwd();
	const gitOps = new GitCliAdapter(cwd);
	// Derive milestone branch from slice ID (e.g., M01-S01 → milestone/M01)
	const milestoneMatch = sliceId.match(/^(M\d+)/);
	const startPoint = milestoneMatch ? `milestone/${milestoneMatch[1]}` : undefined;
	const result = await createWorktreeUseCase({ sliceId, startPoint }, { gitOps });
	if (isOk(result)) {
		const tffDir = path.join(cwd, ".tff");
		const worktreeAbsPath = path.resolve(cwd, result.data.worktreePath);
		copyTffToWorktree(tffDir, worktreeAbsPath);
		return JSON.stringify({ ok: true, data: result.data });
	}
	return JSON.stringify({ ok: false, error: result.error });
};
