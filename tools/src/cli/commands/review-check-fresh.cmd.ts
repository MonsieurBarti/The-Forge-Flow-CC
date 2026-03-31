import { enforceFreshReviewer } from '../../application/review/enforce-fresh-reviewer.js';
import { isOk } from '../../domain/result.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';

export const reviewCheckFreshCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent] = args;
  if (!sliceId || !agent)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: review:check-fresh <slice-id> <agent>' },
    });
  const { taskStore, reviewStore } = createStateStores();
  const result = await enforceFreshReviewer({ sliceId, reviewerAgent: agent }, { taskStore, reviewStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
