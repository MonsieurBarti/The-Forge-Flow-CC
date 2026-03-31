import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { ReviewRecord, ReviewType } from '../value-objects/review-record.js';

export type { ReviewRecord, ReviewType };

export interface ReviewStore {
  recordReview(review: ReviewRecord): Result<void, DomainError>;
  getLatestReview(sliceId: string, type: ReviewType): Result<ReviewRecord | null, DomainError>;
  listReviews(sliceId: string): Result<ReviewRecord[], DomainError>;
}
