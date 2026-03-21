import { describe, it, expect, beforeEach } from 'vitest';
import { enforceFreshReviewer } from './enforce-fresh-reviewer.js';
import { InMemoryReviewStore } from '../../infrastructure/testing/in-memory-review-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('enforceFreshReviewer', () => {
  let reviewStore: InMemoryReviewStore;
  beforeEach(() => { reviewStore = new InMemoryReviewStore(); });

  it('should allow review when reviewer was not an executor', async () => {
    reviewStore.seedExecutors('M01-S01', ['backend-dev']);
    const result = await enforceFreshReviewer({ sliceId: 'M01-S01', reviewerAgent: 'code-reviewer' }, { reviewStore });
    expect(isOk(result)).toBe(true);
  });

  it('should block review when reviewer was an executor', async () => {
    reviewStore.seedExecutors('M01-S01', ['backend-dev', 'frontend-dev']);
    const result = await enforceFreshReviewer({ sliceId: 'M01-S01', reviewerAgent: 'backend-dev' }, { reviewStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('FRESH_REVIEWER_VIOLATION');
  });

  it('should allow review when no executors recorded', async () => {
    const result = await enforceFreshReviewer({ sliceId: 'M01-S01', reviewerAgent: 'code-reviewer' }, { reviewStore });
    expect(isOk(result)).toBe(true);
  });
});
