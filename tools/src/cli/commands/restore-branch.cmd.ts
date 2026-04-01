import { isOk } from '../../domain/result.js';
import { restoreBranchUseCase } from '../../application/state-branch/restore-branch.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';

export const restoreBranchCmd = async (args: string[]): Promise<string> => {
  const [codeBranch] = args;
  if (!codeBranch)
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: restore:branch <code-branch>' } });

  const gitOps = new GitCliAdapter(process.cwd());
  const stateBranch = new GitStateBranchAdapter(gitOps, process.cwd());

  const result = await restoreBranchUseCase({ codeBranch, targetDir: process.cwd() }, { stateBranch });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
