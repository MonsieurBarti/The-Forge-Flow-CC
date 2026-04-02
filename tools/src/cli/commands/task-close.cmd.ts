import { isOk } from '../../domain/result.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const taskCloseCmd = async (args: string[]): Promise<string> => {
  const [taskId, ...rest] = args;
  if (!taskId)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: task:close <task-id> [--reason "..."]' },
    });

  let reason: string | undefined;
  const reasonIdx = rest.indexOf('--reason');
  if (reasonIdx !== -1 && rest[reasonIdx + 1]) {
    reason = rest.slice(reasonIdx + 1).join(' ');
  }

  return withBranchGuard(async ({ taskStore }) => {
    const result = taskStore.closeTask(taskId, reason);
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
