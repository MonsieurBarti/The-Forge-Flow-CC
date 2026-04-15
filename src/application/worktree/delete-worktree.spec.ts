import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { deleteWorktreeUseCase } from './delete-worktree.js';

describe('deleteWorktreeUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => {
    gitOps = new InMemoryGitOps();
  });

  it('should delete an existing worktree', async () => {
    await gitOps.createWorktree('.tff/worktrees/M01-S01', 'slice/M01-S01');
    const result = await deleteWorktreeUseCase({ sliceId: 'M01-S01' }, { gitOps });
    expect(isOk(result)).toBe(true);
  });

  it('should return error for non-existent worktree', async () => {
    const result = await deleteWorktreeUseCase({ sliceId: 'M01-S99' }, { gitOps });
    expect(isErr(result)).toBe(true);
  });
});
