import { assertNotOnMilestoneBranch } from "../../application/guards/milestone-branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

type CommandFn = (args: string[]) => Promise<string>;
type GitFactory = () => GitOps;

export const withMilestoneBranchGuard =
	(command: string, handler: CommandFn, gitFactory?: GitFactory): CommandFn =>
	async (args: string[]): Promise<string> => {
		const git = gitFactory ? gitFactory() : new GitCliAdapter(process.cwd());
		const stores = createClosableStateStoresUnchecked();
		const guard = await assertNotOnMilestoneBranch(
			git,
			command,
			stores.sliceStore,
			stores.milestoneStore,
		);
		if (!guard.ok) {
			return JSON.stringify({ ok: false, error: guard.error });
		}
		return handler(args);
	};
