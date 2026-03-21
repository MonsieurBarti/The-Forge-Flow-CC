import { type Result } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';

export interface ReviewRecord {
  sliceId: string;
  reviewerAgent: string;
  status: 'approved' | 'changes_requested';
  reviewedAt: Date;
}

export interface ReviewStore {
  record(review: ReviewRecord): Promise<Result<void, DomainError>>;
  getExecutorsForSlice(sliceId: string): Promise<Result<string[], DomainError>>;
  getReviewsForSlice(sliceId: string): Promise<Result<ReviewRecord[], DomainError>>;
}
