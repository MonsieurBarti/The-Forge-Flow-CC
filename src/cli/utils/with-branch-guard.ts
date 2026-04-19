import { assertNotOnDefaultBranch } from "../../application/guards/branch-guard.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";

type CommandFn = (args: string[]) => Promise<string>;
type GitFactory = () => GitOps;

export const withBranchGuard =
	(command: string, handler: CommandFn, gitFactory?: GitFactory): CommandFn =>
	async (args: string[]): Promise<string> => {
		const git = gitFactory ? gitFactory() : new GitCliAdapter(process.cwd());
		const guard = await assertNotOnDefaultBranch(git, command);
		if (!guard.ok) {
			return JSON.stringify({ ok: false, error: guard.error });
		}
		return handler(args);
	};
