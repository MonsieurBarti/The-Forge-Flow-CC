import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { createWorktreeUseCase } from './create-worktree.js';

describe('createWorktreeUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => {
    gitOps = new InMemoryGitOps();
  });

  it('should create a worktree with correct path and branch', async () => {
    const result = await createWorktreeUseCase({ sliceId: 'M01-S01' }, { gitOps });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.worktreePath).toBe('.tff/worktrees/M01-S01');
      expect(result.data.branchName).toBe('slice/M01-S01');
      expect(gitOps.hasBranch('slice/M01-S01')).toBe(true);
    }
  });
});
