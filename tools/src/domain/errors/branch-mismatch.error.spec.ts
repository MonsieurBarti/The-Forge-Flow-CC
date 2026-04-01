import { describe, expect, it } from 'vitest';
import { BranchMismatchError } from './branch-mismatch.error.js';

describe('BranchMismatchError', () => {
  it('is instanceof Error', () => {
    const err = new BranchMismatchError('old-branch', 'new-branch');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BranchMismatchError);
  });

  it('exposes expectedBranch and currentBranch', () => {
    const err = new BranchMismatchError('milestone/M01', 'slice/M01-S05');
    expect(err.expectedBranch).toBe('milestone/M01');
    expect(err.currentBranch).toBe('slice/M01-S05');
  });

  it('has descriptive message', () => {
    const err = new BranchMismatchError('a', 'b');
    expect(err.message).toContain('a');
    expect(err.message).toContain('b');
  });
});
