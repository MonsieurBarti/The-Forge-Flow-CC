import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { restoreBranchUseCase } from './restore-branch.js';

describe('restoreBranchUseCase', () => {
  let gitOps: InMemoryGitOps;
  let stateBranch: GitStateBranchAdapter;

  beforeEach(async () => {
    gitOps = new InMemoryGitOps();
    stateBranch = new GitStateBranchAdapter(gitOps, '/tmp/repo');
  });

  it('should return null when no state branch exists', async () => {
    const r = await restoreBranchUseCase(
      { codeBranch: 'main', targetDir: '/tmp/target' },
      { stateBranch },
    );
    expect(isOk(r) && r.data).toBeNull();
  });

  it('should restore from existing state branch', async () => {
    await stateBranch.createRoot();
    gitOps.setTreeFiles('tff-state/main', ['.tff/PROJECT.md']);
    gitOps.setFileContent('tff-state/main', '.tff/PROJECT.md', Buffer.from('# P'));

    const r = await restoreBranchUseCase(
      { codeBranch: 'main', targetDir: '/tmp/target' },
      { stateBranch },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r) && r.data) {
      expect(r.data.filesRestored).toBe(1);
    }
  });
});
