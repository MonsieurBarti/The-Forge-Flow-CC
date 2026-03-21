import { deleteWorktreeUseCase } from '../../application/worktree/delete-worktree.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeDeleteCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: worktree:delete <slice-id>' } });
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await deleteWorktreeUseCase({ sliceId }, { gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
