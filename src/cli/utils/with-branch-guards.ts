import { assertNotOnDefaultBranch } from "../../application/guards/branch-guard.js";
import { assertNotOnMilestoneBranch } from "../../application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

type CommandFn = (args: string[]) => Promise<string>;
type GitFactory = () => GitOps;

export const withBranchGuards =
	(command: string, handler: CommandFn, opts?: { gitFactory?: GitFactory }): CommandFn =>
	async (args: string[]): Promise<string> => {
		const git = opts?.gitFactory ? opts.gitFactory() : new GitCliAdapter(process.cwd());

		const defaultGuard = await assertNotOnDefaultBranch(git, command);
		if (!defaultGuard.ok) {
			return JSON.stringify({ ok: false, error: defaultGuard.error });
		}

		const stores = createClosableStateStoresUnchecked();
		try {
			const milestoneGuard = await assertNotOnMilestoneBranch(
				git,
				command,
				stores.sliceStore,
				stores.milestoneStore,
			);
			if (!milestoneGuard.ok) {
				return JSON.stringify({ ok: false, error: milestoneGuard.error });
			}
			return await handler(args);
		} finally {
			stores.close();
		}
	};
