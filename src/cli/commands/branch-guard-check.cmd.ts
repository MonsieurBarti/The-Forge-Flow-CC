import { assertNotOnDefaultBranch } from "../../application/guards/branch-guard.js";
import { assertNotOnMilestoneBranch } from "../../application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import type { CommandSchema } from "../utils/flag-parser.js";
import { parseFlags } from "../utils/flag-parser.js";

export const branchGuardCheckSchema: CommandSchema = {
	name: "branch-guard:check",
	purpose: "Check whether the current branch violates default-branch or milestone-branch guards",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "cwd",
			type: "string",
			description: "Working directory to resolve git and DB from (defaults to process.cwd())",
		},
	],
	examples: ["branch-guard:check", "branch-guard:check --cwd /path/to/repo"],
};

export const branchGuardCheckCmd =
	(gitFactory?: () => GitOps) =>
	async (args: string[]): Promise<string> => {
		const parsed = parseFlags(args, branchGuardCheckSchema);
		if (!parsed.ok) {
			return JSON.stringify(parsed);
		}

		const flags = parsed.data as { cwd?: string };
		const cwd = flags.cwd ?? process.cwd();

		const git = gitFactory ? gitFactory() : new GitCliAdapter(cwd);

		// Always enforce the default-branch check — TFF_ALLOW_MILESTONE_COMMIT does NOT bypass this.
		const defaultGuard = await assertNotOnDefaultBranch(git, "branch-guard:check");
		if (!defaultGuard.ok) {
			return JSON.stringify({ ok: false, error: defaultGuard.error });
		}

		// Milestone-branch check: skip when the env override is set (hotfix path).
		if (process.env.TFF_ALLOW_MILESTONE_COMMIT === "1") {
			const branchR = await git.getCurrentBranch();
			const branch = branchR.ok ? branchR.data : "<unknown>";
			return JSON.stringify({ ok: true, data: { branch, violation: null } });
		}

		const stores = createClosableStateStoresUnchecked();
		try {
			const milestoneGuard = await assertNotOnMilestoneBranch(
				git,
				"branch-guard:check",
				stores.sliceStore,
				stores.milestoneStore,
			);
			if (!milestoneGuard.ok) {
				return JSON.stringify({ ok: false, error: milestoneGuard.error });
			}

			const branchR = await git.getCurrentBranch();
			const branch = branchR.ok ? branchR.data : "<unknown>";
			return JSON.stringify({ ok: true, data: { branch, violation: null } });
		} finally {
			stores.close();
		}
	};
