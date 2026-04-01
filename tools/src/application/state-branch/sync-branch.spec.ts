import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { syncBranchUseCase } from './sync-branch.js';

describe('syncBranchUseCase', () => {
  let stateBranch: GitStateBranchAdapter;

  beforeEach(async () => {
    const gitOps = new InMemoryGitOps();
    stateBranch = new GitStateBranchAdapter(gitOps, '/tmp/repo');
    await stateBranch.createRoot();
  });

  it('should sync state to branch', async () => {
    const r = await syncBranchUseCase({ codeBranch: 'main', message: 'sync after transition' }, { stateBranch });
    expect(isOk(r)).toBe(true);
  });
});
