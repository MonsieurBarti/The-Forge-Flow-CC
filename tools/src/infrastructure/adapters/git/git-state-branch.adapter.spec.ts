import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

  describe('fork', () => {
    it('should create child state branch from parent', async () => {
      await adapter.createRoot();
      const r = await adapter.fork('milestone/M01', 'tff-state/main');
      expect(isOk(r)).toBe(true);
      expect(gitOps.hasBranch('tff-state/milestone/M01')).toBe(true);
    });

    it('should fail if parent state branch does not exist', async () => {
      const r = await adapter.fork('milestone/M01', 'tff-state/nonexistent');
      expect(isOk(r)).toBe(false);
    });
  });

  describe('sync', () => {
    it('should sync to existing state branch', async () => {
      await adapter.createRoot();
      const r = await adapter.sync('main', 'test sync');
      expect(isOk(r)).toBe(true);
      const commits = gitOps.getCommits();
      expect(commits.some((c) => c.message.includes('test sync'))).toBe(true);
    });

    it('should fail if state branch does not exist', async () => {
      const r = await adapter.sync('nonexistent', 'test');
      expect(isOk(r)).toBe(false);
    });
  });

  describe('restore', () => {
    it('should return null when state branch does not exist', async () => {
      const r = await adapter.restore('nonexistent', '/tmp/target');
      expect(isOk(r) && r.data).toBeNull();
    });

    it('should restore files from state branch', async () => {
      await adapter.createRoot();
      gitOps.setTreeFiles('tff-state/main', ['.tff/PROJECT.md', '.tff/state.db']);
      gitOps.setFileContent('tff-state/main', '.tff/PROJECT.md', Buffer.from('# Test'));
      gitOps.setFileContent('tff-state/main', '.tff/state.db', Buffer.from('binary-data'));

      const targetDir = mkdtempSync(path.join(tmpdir(), 'restore-'));
      const r = await adapter.restore('main', targetDir);
      expect(isOk(r)).toBe(true);
      if (isOk(r) && r.data) {
        expect(r.data.filesRestored).toBe(2);
        // Verify files actually written to disk
        expect(readFileSync(path.join(targetDir, '.tff', 'PROJECT.md'), 'utf-8')).toBe('# Test');
        expect(readFileSync(path.join(targetDir, '.tff', 'state.db'), 'utf-8')).toBe('binary-data');
      }
    });
  });

  describe('merge', () => {
    it('should merge child into parent', async () => {
      await adapter.createRoot();
      await adapter.fork('slice/M01-S01', 'tff-state/main');
      const r = await adapter.merge('slice/M01-S01', 'main', 'test-slice-id');
      expect(isOk(r)).toBe(true);
      if (isOk(r)) {
        expect(r.data.entitiesMerged).toBeGreaterThanOrEqual(0);
        expect(r.data.artifactsCopied).toBeGreaterThanOrEqual(0);
      }
    });

    it('should fail if child state branch does not exist', async () => {
      await adapter.createRoot();
      const r = await adapter.merge('nonexistent', 'main', 'test-id');
      expect(isOk(r)).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('should delete an existing state branch (takes CODE branch name)', async () => {
      await adapter.createRoot();
      await adapter.fork('milestone/M01', 'tff-state/main');
      const r = await adapter.deleteBranch('milestone/M01');
      expect(isOk(r)).toBe(true);
      const existsR = await adapter.exists('milestone/M01');
      expect(isOk(existsR) && existsR.data).toBe(false);
    });
  });
});
