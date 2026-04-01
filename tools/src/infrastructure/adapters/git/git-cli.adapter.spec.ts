import { describe, expect, it } from 'vitest';
import { GitCliAdapter } from './git-cli.adapter.js';
import { isOk } from '../../../domain/result.js';

describe('GitCliAdapter - caching', () => {
  it('should cache getCurrentBranch within TTL', async () => {
    const adapter = new GitCliAdapter(process.cwd());
    const branch1 = await adapter.getCurrentBranch();
    const branch2 = await adapter.getCurrentBranch();
    expect(branch1).toEqual(branch2);
  });

  it('should have invalidateCache method', () => {
    const adapter = new GitCliAdapter(process.cwd());
    expect(typeof adapter.invalidateCache).toBe('function');
  });

  it('should still work after cache invalidation', async () => {
    const adapter = new GitCliAdapter(process.cwd());
    await adapter.getCurrentBranch();
    adapter.invalidateCache();
    const branch = await adapter.getCurrentBranch();
    expect(branch).toBeDefined();
  });
});

describe('GitCliAdapter — S03 branch methods', () => {
  const adapter = new GitCliAdapter(process.cwd());

  it('branchExists should return true for current branch', async () => {
    const branchR = await adapter.getCurrentBranch();
    expect(isOk(branchR)).toBe(true);
    if (!isOk(branchR)) return;
    const r = await adapter.branchExists(branchR.data);
    expect(isOk(r) && r.data).toBe(true);
  });

  it('branchExists should return false for non-existing branch', async () => {
    const r = await adapter.branchExists('nonexistent-branch-abc123');
    expect(isOk(r) && r.data).toBe(false);
  });

  it('pruneWorktrees should succeed', async () => {
    const r = await adapter.pruneWorktrees();
    expect(isOk(r)).toBe(true);
  });
});
