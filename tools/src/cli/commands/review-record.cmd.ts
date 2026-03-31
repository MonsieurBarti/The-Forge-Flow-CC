import { recordReviewUseCase } from '../../application/review/record-review.js';
import { isOk } from '../../domain/result.js';
import type { ReviewType } from '../../domain/value-objects/review-record.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';

export const reviewRecordCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent, verdict, type, commitSha] = args;
  if (!sliceId || !agent || !verdict || !type || !commitSha) {
    return JSON.stringify({
      ok: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'Usage: review:record <slice-id> <agent> <verdict> <type> <commit-sha>',
      },
    });
  }
  const { reviewStore } = createStateStores();
  const result = await recordReviewUseCase(
    {
      sliceId,
      reviewer: agent,
      verdict: verdict as 'approved' | 'changes_requested',
      type: type as ReviewType,
      commitSha,
    },
    { reviewStore },
  );
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
