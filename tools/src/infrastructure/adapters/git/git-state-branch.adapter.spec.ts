import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../../domain/result.js';
import { InMemoryGitOps } from '../../testing/in-memory-git-ops.js';
import { GitStateBranchAdapter } from './git-state-branch.adapter.js';

describe('GitStateBranchAdapter', () => {
  let gitOps: InMemoryGitOps;
  let adapter: GitStateBranchAdapter;

  beforeEach(() => {
    gitOps = new InMemoryGitOps();
    adapter = new GitStateBranchAdapter(gitOps, '/tmp/repo');
  });

  describe('createRoot', () => {
    it('should create root state branch', async () => {
      const r = await adapter.createRoot();
      expect(isOk(r)).toBe(true);
      expect(gitOps.hasBranch('tff-state/main')).toBe(true);
    });

    it('should fail if root already exists', async () => {
      await adapter.createRoot();
      const r = await adapter.createRoot();
      expect(isOk(r)).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return false when state branch does not exist', async () => {
      const r = await adapter.exists('main');
      expect(isOk(r) && r.data).toBe(false);
    });

    it('should return true after createRoot', async () => {
      await adapter.createRoot();
      const r = await adapter.exists('main');
      expect(isOk(r) && r.data).toBe(true);
    });
  });
});
