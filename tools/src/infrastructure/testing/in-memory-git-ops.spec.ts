import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryGitOps } from './in-memory-git-ops.js';

describe('InMemoryGitOps — S03 extensions', () => {
  let git: InMemoryGitOps;
  beforeEach(() => { git = new InMemoryGitOps(); });

  it('createOrphanWorktree should create branch without parent history', async () => {
    const r = await git.createOrphanWorktree('/tmp/wt', 'tff-state/main');
    expect(isOk(r)).toBe(true);
    expect(git.hasBranch('tff-state/main')).toBe(true);
  });

  it('checkoutWorktree should succeed for existing branch', async () => {
    await git.createBranch('tff-state/main', 'main');
    const r = await git.checkoutWorktree('/tmp/wt', 'tff-state/main');
    expect(isOk(r)).toBe(true);
  });

  it('checkoutWorktree should fail for non-existing branch', async () => {
    const r = await git.checkoutWorktree('/tmp/wt', 'tff-state/missing');
    expect(isOk(r)).toBe(false);
  });

  it('branchExists should return true for existing branch', async () => {
    const r = await git.branchExists('main');
    expect(isOk(r) && r.data).toBe(true);
  });

  it('branchExists should return false for non-existing branch', async () => {
    const r = await git.branchExists('nope');
    expect(isOk(r) && r.data).toBe(false);
  });

  it('deleteBranch should remove a branch', async () => {
    await git.createBranch('temp', 'main');
    const r = await git.deleteBranch('temp');
    expect(isOk(r)).toBe(true);
    expect(git.hasBranch('temp')).toBe(false);
  });

  it('pruneWorktrees should succeed', async () => {
    const r = await git.pruneWorktrees();
    expect(isOk(r)).toBe(true);
  });

  it('lsTree should return stored files', async () => {
    git.setTreeFiles('tff-state/main', ['.tff/state.db', '.tff/PROJECT.md']);
    const r = await git.lsTree('tff-state/main');
    expect(isOk(r) && r.data).toEqual(['.tff/state.db', '.tff/PROJECT.md']);
  });

  it('extractFile should return stored buffer', async () => {
    const buf = Buffer.from('hello');
    git.setFileContent('tff-state/main', '.tff/PROJECT.md', buf);
    const r = await git.extractFile('tff-state/main', '.tff/PROJECT.md');
    expect(isOk(r) && r.data).toEqual(buf);
  });

  it('detectDefaultBranch should return main', async () => {
    const r = await git.detectDefaultBranch();
    expect(isOk(r) && r.data).toBe('main');
  });
});
