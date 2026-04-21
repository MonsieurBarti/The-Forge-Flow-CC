import { listWorktreesUseCase } from "../../application/worktree/list-worktrees.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import type { CommandSchema } from "../utils/flag-parser.js";

export const worktreeListSchema: CommandSchema = {
	name: "worktree:list",
	purpose: "List all git worktrees",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["worktree:list"],
};

export const worktreeListCmd = async (args: string[]): Promise<string> => {
	// Check for --help flag
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: worktreeListSchema.name,
				purpose: worktreeListSchema.purpose,
				syntax: worktreeListSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: worktreeListSchema.examples,
			},
		});
	}

	const gitOps = new GitCliAdapter(process.cwd());
	const result = await listWorktreesUseCase({ gitOps });
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
