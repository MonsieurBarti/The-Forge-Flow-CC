import { recordReviewUseCase } from '../../application/review/record-review.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { ReviewMetadataAdapter } from '../../infrastructure/adapters/review/review-metadata.adapter.js';
import { isOk } from '../../domain/result.js';

export const reviewRecordCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent, status] = args;
  if (!sliceId || !agent || !status) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: review:record <slice-id> <agent> <approved|changes_requested>' } });
  }
  const beadStore = new BdCliAdapter();
  const reviewStore = new ReviewMetadataAdapter(beadStore);
  const result = await recordReviewUseCase(
    { sliceId, reviewerAgent: agent, status: status as 'approved' | 'changes_requested' },
    { reviewStore },
  );
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
