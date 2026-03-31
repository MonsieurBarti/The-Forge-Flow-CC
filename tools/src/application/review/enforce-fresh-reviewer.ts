import type { DomainError } from '../../domain/errors/domain-error.js';
import { freshReviewerViolationError } from '../../domain/errors/fresh-reviewer-violation.error.js';
import type { ReviewStore } from '../../domain/ports/review-store.port.js';
import type { TaskStore } from '../../domain/ports/task-store.port.js';
import { Err, isOk, Ok, type Result } from '../../domain/result.js';

interface EnforceFreshReviewerInput {
  sliceId: string;
  reviewerAgent: string;
}
interface EnforceFreshReviewerDeps {
  taskStore: TaskStore;
  reviewStore: ReviewStore;
}

export const enforceFreshReviewer = async (
  input: EnforceFreshReviewerInput,
  deps: EnforceFreshReviewerDeps,
): Promise<Result<void, DomainError>> => {
  const executorsResult = deps.taskStore.getExecutorsForSlice(input.sliceId);
  if (!isOk(executorsResult)) return executorsResult;
  if (executorsResult.data.includes(input.reviewerAgent))
    return Err(freshReviewerViolationError(input.sliceId, input.reviewerAgent));
  return Ok(undefined);
};
