import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryReviewStore } from '../../infrastructure/testing/in-memory-review-store.js';
import { recordReviewUseCase } from './record-review.js';

describe('recordReviewUseCase', () => {
  let reviewStore: InMemoryReviewStore;
  beforeEach(() => {
    reviewStore = new InMemoryReviewStore();
  });

  it('should record a review', async () => {
    const result = await recordReviewUseCase(
      { sliceId: 'M01-S01', reviewerAgent: 'code-reviewer', status: 'approved' },
      { reviewStore },
    );

    expect(isOk(result)).toBe(true);

    const reviews = await reviewStore.getReviewsForSlice('M01-S01');
    expect(isOk(reviews) && reviews.data.length).toBe(1);
  });
});
