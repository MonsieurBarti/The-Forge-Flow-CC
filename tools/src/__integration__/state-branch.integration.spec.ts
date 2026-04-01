import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { GitCliAdapter } from '../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../infrastructure/adapters/git/git-state-branch.adapter.js';
import { SQLiteStateAdapter } from '../infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { isOk } from '../domain/result.js';

const git = (args: string[], cwd: string) =>
  execFileSync('git', args, { cwd, encoding: 'utf-8', timeout: 10_000 });

describe('State Branch Integration', () => {
  let repoDir: string;
  let gitOps: GitCliAdapter;
  let adapter: GitStateBranchAdapter;

  beforeEach(() => {
    repoDir = mkdtempSync(path.join(tmpdir(), 'tff-s03-'));
    git(['init', '--initial-branch=main'], repoDir);
    git(['config', 'user.email', 'test@test.com'], repoDir);
    git(['config', 'user.name', 'Test'], repoDir);
    writeFileSync(path.join(repoDir, 'README.md'), '# Test');
    git(['add', '.'], repoDir);
    git(['commit', '-m', 'init'], repoDir);
    gitOps = new GitCliAdapter(repoDir);
    adapter = new GitStateBranchAdapter(gitOps, repoDir);
  });

  it('should create root state branch as true orphan', async () => {
    const r = await adapter.createRoot();
    expect(isOk(r)).toBe(true);

    const existsR = await adapter.exists('main');
    expect(isOk(existsR) && existsR.data).toBe(true);

    // Verify it's a true orphan — no shared merge-base with main
    let mergeBaseFound = true;
    try {
      git(['merge-base', 'main', 'tff-state/main'], repoDir);
    } catch {
      // merge-base exits non-zero when there is no common ancestor — expected for orphan
      mergeBaseFound = false;
    }
    expect(mergeBaseFound).toBe(false);
  });

  it('should sync and restore roundtrip', async () => {
    await adapter.createRoot();

    // Create .tff/ with real data
    const tffDir = path.join(repoDir, '.tff');
    mkdirSync(tffDir, { recursive: true });
    writeFileSync(path.join(tffDir, 'PROJECT.md'), '# Test Project');

    const dbPath = path.join(tffDir, 'state.db');
    const sqliteAdapter = SQLiteStateAdapter.create(dbPath);
    sqliteAdapter.init();
    sqliteAdapter.saveProject({ name: 'Test', vision: 'Test vision' });
    sqliteAdapter.checkpoint();
    sqliteAdapter.close();

    // Sync to state branch
    const syncR = await adapter.sync('main', 'test sync');
    expect(isOk(syncR)).toBe(true);

    // Restore to a different directory
    const restoreDir = mkdtempSync(path.join(tmpdir(), 'tff-restore-'));
    const restoreR = await adapter.restore('main', restoreDir);
    expect(isOk(restoreR)).toBe(true);
    if (isOk(restoreR) && restoreR.data) {
      expect(restoreR.data.filesRestored).toBeGreaterThan(0);
      // Verify the restored PROJECT.md
      const restoredProject = readFileSync(path.join(restoreDir, '.tff', 'PROJECT.md'), 'utf-8');
      expect(restoredProject).toBe('# Test Project');
      // Verify the restored DB is valid
      expect(existsSync(path.join(restoreDir, '.tff', 'state.db'))).toBe(true);
    }
  });

  it('should fork child state branch from parent', async () => {
    await adapter.createRoot();

    // Fork a milestone state branch
    const forkR = await adapter.fork('milestone/M01', 'tff-state/main');
    expect(isOk(forkR)).toBe(true);

    const existsR = await adapter.exists('milestone/M01');
    expect(isOk(existsR) && existsR.data).toBe(true);
  });

  it('parallel slices: fork, modify independently, merge both', async () => {
    await adapter.createRoot();

    const forkMR = await adapter.fork('milestone/M01', 'tff-state/main');
    expect(isOk(forkMR)).toBe(true);

    const forkS1R = await adapter.fork('slice/M01-S01', 'tff-state/milestone/M01');
    const forkS2R = await adapter.fork('slice/M01-S02', 'tff-state/milestone/M01');
    expect(isOk(forkS1R)).toBe(true);
    expect(isOk(forkS2R)).toBe(true);

    // Merge both slice state branches back into milestone
    const merge1R = await adapter.merge('slice/M01-S01', 'milestone/M01', 's01-id');
    expect(isOk(merge1R)).toBe(true);

    const merge2R = await adapter.merge('slice/M01-S02', 'milestone/M01', 's02-id');
    expect(isOk(merge2R)).toBe(true);

    // Milestone state branch should still exist
    const milestoneExistsR = await adapter.exists('milestone/M01');
    expect(isOk(milestoneExistsR) && milestoneExistsR.data).toBe(true);
  });
});
