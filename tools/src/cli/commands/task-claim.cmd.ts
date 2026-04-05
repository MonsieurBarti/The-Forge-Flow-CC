import { isOk } from '../../domain/result.js';
import type { TaskStartedEntry } from '../../domain/value-objects/journal-entry.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const taskClaimCmd = async (args: string[]): Promise<string> => {
  const [taskId, claimedBy] = args;
  if (!taskId)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: task:claim <task-id> [claimed-by]' },
    });

  return withBranchGuard(async ({ taskStore, journalRepository }) => {
    // Read task to get wave index and sliceId for journal entry
    const taskResult = taskStore.getTask(taskId);
    if (!isOk(taskResult)) return JSON.stringify({ ok: false, error: taskResult.error });
    if (!taskResult.data)
      return JSON.stringify({ ok: false, error: { code: 'TASK_NOT_FOUND', message: `Task ${taskId} not found` } });

    const task = taskResult.data;
    const waveIndex = task.wave ?? 0;
    const agentIdentity = claimedBy ?? 'anonymous';

    // Write task-started entry to journal BEFORE claiming (fail-fast)
    const journalEntry: Omit<TaskStartedEntry, 'seq'> = {
      type: 'task-started',
      sliceId: task.sliceId,
      taskId,
      waveIndex,
      agentIdentity,
      timestamp: new Date().toISOString(),
    };
    const journalResult = journalRepository.append(task.sliceId, journalEntry);
    if (!isOk(journalResult)) return JSON.stringify({ ok: false, error: journalResult.error });

    // Proceed with existing claimTask logic
    const result = taskStore.claimTask(taskId, claimedBy);
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
