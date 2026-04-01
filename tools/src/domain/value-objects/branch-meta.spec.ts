import { describe, expect, it } from 'vitest';
import { BranchMetaSchema } from './branch-meta.js';

describe('BranchMeta', () => {
  it('should validate a valid branch meta', () => {
    const result = BranchMetaSchema.safeParse({
      stateId: '550e8400-e29b-41d4-a716-446655440000',
      codeBranch: 'slice/M01-S01',
      parentStateBranch: 'tff-state/milestone/M01',
      createdAt: '2026-03-31T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null parentStateBranch for root', () => {
    const result = BranchMetaSchema.safeParse({
      stateId: '550e8400-e29b-41d4-a716-446655440000',
      codeBranch: 'main',
      parentStateBranch: null,
      createdAt: '2026-03-31T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing stateId', () => {
    const result = BranchMetaSchema.safeParse({
      codeBranch: 'main',
      parentStateBranch: null,
      createdAt: '2026-03-31T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});
