import { recordReviewUseCase } from '../../application/review/record-review.js';
import { isOk } from '../../domain/result.js';
import { ReviewTypeSchema } from '../../domain/value-objects/review-record.js';
import { withBranchGuard } from '../with-branch-guard.js';

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
  const parsedType = ReviewTypeSchema.safeParse(type);
  if (!parsedType.success) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: `Invalid type "${type}". Must be: code, security, spec` },
    });
  }
  const validVerdicts = ['approved', 'changes_requested'];
  if (!validVerdicts.includes(verdict)) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: `Invalid verdict "${verdict}". Must be: approved, changes_requested` },
    });
  }
  return withBranchGuard(async ({ reviewStore }) => {
    const result = await recordReviewUseCase(
      {
        sliceId,
        reviewer: agent,
        verdict: verdict as 'approved' | 'changes_requested',
        type: parsedType.data,
        commitSha,
      },
      { reviewStore },
    );
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
