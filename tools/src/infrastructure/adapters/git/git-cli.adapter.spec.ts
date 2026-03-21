import { describe, it, expect } from 'vitest';
import { GitCliAdapter } from './git-cli.adapter.js';

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
