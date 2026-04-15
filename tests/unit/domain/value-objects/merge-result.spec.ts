import { describe, expect, it } from 'vitest';
import { MergeResultSchema } from '../../../src/domain/merge-result.js';

describe('MergeResult', () => {
  it('should validate a valid merge result', () => {
    const result = MergeResultSchema.safeParse({ entitiesMerged: 12, artifactsCopied: 3 });
    expect(result.success).toBe(true);
  });
});
