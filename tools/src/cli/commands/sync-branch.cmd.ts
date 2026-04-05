import { syncBranchUseCase } from '../../application/state-branch/sync-branch.js';
import { isOk } from '../../domain/result.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { withClosableBranchGuard } from '../with-branch-guard.js';
import { withClosableSyncLock } from '../with-sync-lock.js';

export const syncBranchCmd = async (args: string[]): Promise<string> => {
  const [codeBranch, message] = args;
  if (!codeBranch)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: sync:branch <code-branch> [message]' },
    });

  const result = await withClosableSyncLock(async () => {
    return withClosableBranchGuard(async (stores) => {
      const gitOps = new GitCliAdapter(process.cwd());
      const stateBranch = new GitStateBranchAdapter(gitOps, process.cwd());
      try {
        stores.checkpoint();
        const result = await syncBranchUseCase(
          { codeBranch, message: message ?? `sync: ${codeBranch}` },
          { stateBranch },
        );
        if (isOk(result)) return JSON.stringify({ ok: true, data: { synced: codeBranch } });
        return JSON.stringify({ ok: false, error: result.error });
      } finally {
        stores.close();
      }
    });
  });

  // If result is a string, it came from the inner function; otherwise it's a SyncLockResult
  if (typeof result === 'string') return result;
  return JSON.stringify(result);
};
