import { listWorktreesUseCase } from '../../application/worktree/list-worktrees.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeListCmd = async (_args: string[]): Promise<string> => {
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await listWorktreesUseCase({ gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
