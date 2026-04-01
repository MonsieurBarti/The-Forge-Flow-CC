import { describe, expect, it } from 'vitest';
import { syncBranchCmd } from './sync-branch.cmd.js';
import { restoreBranchCmd } from './restore-branch.cmd.js';
import { branchMergeCmd } from './branch-merge.cmd.js';

describe('state branch CLI commands', () => {
  it('sync:branch should reject missing args', async () => {
    const result = JSON.parse(await syncBranchCmd([]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_ARGS');
  });

  it('restore:branch should reject missing args', async () => {
    const result = JSON.parse(await restoreBranchCmd([]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_ARGS');
  });

  it('branch:merge should reject missing args', async () => {
    const result = JSON.parse(await branchMergeCmd([]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_ARGS');
  });
});
