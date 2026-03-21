import { type ReviewStore, type ReviewRecord } from '../../domain/ports/review-store.port.js';
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';

export class InMemoryReviewStore implements ReviewStore {
  private reviews: ReviewRecord[] = [];
  private executors = new Map<string, string[]>();

  async record(review: ReviewRecord): Promise<Result<void, DomainError>> { this.reviews.push(review); return Ok(undefined); }

  async getExecutorsForSlice(sliceId: string): Promise<Result<string[], DomainError>> {
    return Ok(this.executors.get(sliceId) ?? []);
  }

  async getReviewsForSlice(sliceId: string): Promise<Result<ReviewRecord[], DomainError>> {
    return Ok(this.reviews.filter((r) => r.sliceId === sliceId));
  }

  reset(): void { this.reviews = []; this.executors.clear(); }
  seedExecutors(sliceId: string, agents: string[]): void { this.executors.set(sliceId, agents); }
}
