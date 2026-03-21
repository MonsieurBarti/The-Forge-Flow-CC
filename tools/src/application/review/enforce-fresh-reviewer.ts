import { type Result, Ok, Err, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { freshReviewerViolationError } from '../../domain/errors/fresh-reviewer-violation.error.js';
import { type ReviewStore } from '../../domain/ports/review-store.port.js';

interface EnforceFreshReviewerInput { sliceId: string; reviewerAgent: string; }
interface EnforceFreshReviewerDeps { reviewStore: ReviewStore; }

export const enforceFreshReviewer = async (
  input: EnforceFreshReviewerInput, deps: EnforceFreshReviewerDeps,
): Promise<Result<void, DomainError>> => {
  const executorsResult = await deps.reviewStore.getExecutorsForSlice(input.sliceId);
  if (!isOk(executorsResult)) return executorsResult;
  if (executorsResult.data.includes(input.reviewerAgent)) return Err(freshReviewerViolationError(input.sliceId, input.reviewerAgent));
  return Ok(undefined);
};
