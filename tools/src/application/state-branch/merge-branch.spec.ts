import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { mergeBranchUseCase } from './merge-branch.js';

describe('mergeBranchUseCase', () => {
  let stateBranch: GitStateBranchAdapter;

  beforeEach(async () => {
    const gitOps = new InMemoryGitOps();
    stateBranch = new GitStateBranchAdapter(gitOps, '/tmp/repo');
    await stateBranch.createRoot();
    await stateBranch.fork('slice/M01-S01', 'tff-state/main');
  });

  it('should merge child into parent and delete child branch', async () => {
    const r = await mergeBranchUseCase(
      { childCodeBranch: 'slice/M01-S01', parentCodeBranch: 'main', sliceId: 'test-slice' },
      { stateBranch },
    );
    expect(isOk(r)).toBe(true);
  });
});
