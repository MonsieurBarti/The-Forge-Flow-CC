import { createWorktreeUseCase } from '../../application/worktree/create-worktree.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeCreateCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: worktree:create <slice-id>' } });
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await createWorktreeUseCase({ sliceId }, { gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
