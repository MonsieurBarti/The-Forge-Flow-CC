import { describe, expect, it } from 'vitest';
import type { GitOps } from './git-ops.port.js';

describe('GitOps port', () => {
  it('should define all required methods including S03 extensions', () => {
    const methods: (keyof GitOps)[] = [
      'createBranch',
      'createWorktree',
      'deleteWorktree',
      'listWorktrees',
      'commit',
      'revert',
      'merge',
      'getCurrentBranch',
      'getHeadSha',
      'createOrphanWorktree',
      'checkoutWorktree',
      'branchExists',
      'deleteBranch',
      'pruneWorktrees',
      'lsTree',
      'extractFile',
      'detectDefaultBranch',
    ];
    expect(methods).toHaveLength(17);
  });
});
