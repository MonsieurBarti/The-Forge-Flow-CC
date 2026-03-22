import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ReviewStore } from '../../domain/ports/review-store.port.js';
import type { Result } from '../../domain/result.js';

interface RecordReviewInput {
  sliceId: string;
  reviewerAgent: string;
  status: 'approved' | 'changes_requested';
}

interface RecordReviewDeps {
  reviewStore: ReviewStore;
}

export const recordReviewUseCase = async (
  input: RecordReviewInput,
  deps: RecordReviewDeps,
): Promise<Result<void, DomainError>> => {
  return deps.reviewStore.record({
    sliceId: input.sliceId,
    reviewerAgent: input.reviewerAgent,
    status: input.status,
    reviewedAt: new Date(),
  });
};
