import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../src/domain/result.js';
import { InMemoryGitOps } from '../../src/infrastructure/testing/in-memory-git-ops.js';
import { listWorktreesUseCase } from '../../../src/application/worktree/list-worktrees.js';

describe('listWorktreesUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => {
    gitOps = new InMemoryGitOps();
  });

  it('should list all worktrees', async () => {
    await gitOps.createWorktree('.tff/worktrees/M01-S01', 'slice/M01-S01');
    await gitOps.createWorktree('.tff/worktrees/M01-S02', 'slice/M01-S02');

    const result = await listWorktreesUseCase({ gitOps });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });
});
