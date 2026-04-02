import { isOk } from '../../domain/result.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const taskClaimCmd = async (args: string[]): Promise<string> => {
  const [taskId, claimedBy] = args;
  if (!taskId)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: task:claim <task-id> [claimed-by]' },
    });

  return withBranchGuard(async ({ taskStore }) => {
    const result = taskStore.claimTask(taskId, claimedBy);
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
