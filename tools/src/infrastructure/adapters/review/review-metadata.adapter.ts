import { type ReviewStore, type ReviewRecord } from '../../../domain/ports/review-store.port.js';
import { type Result, Ok, isOk } from '../../../domain/result.js';
import { type DomainError } from '../../../domain/errors/domain-error.js';
import { type BeadStore } from '../../../domain/ports/bead-store.port.js';

export class ReviewMetadataAdapter implements ReviewStore {
  constructor(private readonly beadStore: BeadStore) {}

  async record(review: ReviewRecord): Promise<Result<void, DomainError>> {
    const key = `review.${review.reviewerAgent}.${Date.now()}`;
    const value = JSON.stringify({ status: review.status, reviewedAt: review.reviewedAt.toISOString() });
    return this.beadStore.updateMetadata(review.sliceId, key, value);
  }

  async getExecutorsForSlice(sliceId: string): Promise<Result<string[], DomainError>> {
    const tasksResult = await this.beadStore.list({ label: 'tff:task', parentId: sliceId });
    if (!isOk(tasksResult)) return tasksResult;
    const executors = tasksResult.data.filter((t) => t.metadata?.executor).map((t) => t.metadata!.executor);
    return Ok([...new Set(executors)]);
  }

  async getReviewsForSlice(sliceId: string): Promise<Result<ReviewRecord[], DomainError>> {
    const beadResult = await this.beadStore.get(sliceId);
    if (!isOk(beadResult)) return beadResult as Result<never, DomainError>;
    const reviews: ReviewRecord[] = [];
    const metadata = beadResult.data.metadata ?? {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith('review.')) {
        const parts = key.split('.');
        const parsed = JSON.parse(value);
        reviews.push({ sliceId, reviewerAgent: parts[1], status: parsed.status, reviewedAt: new Date(parsed.reviewedAt) });
      }
    }
    return Ok(reviews);
  }
}
