import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { syncBranchCmd } from '../cli/commands/sync-branch.cmd.js';
import { syncStateCmd } from '../cli/commands/sync-state.cmd.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';
import { acquireSyncLock } from '../infrastructure/locking/tff-lock.js';

describe('sync-lock integration', () => {
  let tmpDir: string;
  let tffDir: string;
  let dbPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-sync-lock-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    mkdirSync(tffDir, { recursive: true });
    dbPath = join(tffDir, 'state.db');

    // Change to temp directory so commands use the right paths
    process.chdir(tmpDir);

    // Create the lock file (must exist for proper-lockfile)
    writeFileSync(dbPath, '');

    // Initialize git repo
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'ignore', env });

    // Write synthetic stamp to avoid branch mismatch errors
    const currentBranch = execSync('git branch --show-current', {
      cwd: tmpDir,
      encoding: 'utf8',
    }).trim();
    writeSyntheticStamp(tffDir, currentBranch);

    // Initialize project and create milestone
    const initResult = JSON.parse(await projectInitCmd(['test-project', 'Test project for sync lock']));
    expect(initResult.ok).toBe(true);

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('concurrent sync:state calls', () => {
    it('serializes concurrent sync operations with lock', async () => {
      // Pre-acquire the lock to force contention
      const lockPath = dbPath;
      const release = await acquireSyncLock(lockPath, 1000);
      expect(release).not.toBeNull();

      try {
        // While holding the lock, try to run sync:state
        // This should timeout and return a skip response
        const result = await syncStateCmd(['M01']);
        const parsed = JSON.parse(result);

        // Should return skip response because lock is held
        expect(parsed.ok).toBe(true);
        expect(parsed.data?.action).toBe('skipped');
        expect(parsed.data?.reason).toContain('Lock held');
      } finally {
        // Release the lock
        if (release) await release();
      }

      // After releasing, sync:state should work normally
      const result2 = await syncStateCmd(['M01']);
      const parsed2 = JSON.parse(result2);
      expect(parsed2.ok).toBe(true);
      expect(parsed2.data).toBeNull();
    }, 10000);

    it('allows sequential sync operations', async () => {
      // Run sequential calls
      const result1 = JSON.parse(await syncStateCmd(['M01']));
      const result2 = JSON.parse(await syncStateCmd(['M01']));

      // Both should succeed since they're not concurrent
      expect(result1.ok).toBe(true);
      expect(result1.data).toBeNull();
      expect(result2.ok).toBe(true);
      expect(result2.data).toBeNull();
    });
  });

  describe('concurrent sync:branch calls', () => {
    it('returns skip when lock is held', async () => {
      // Pre-acquire the lock to force contention
      const lockPath = dbPath;
      const release = await acquireSyncLock(lockPath, 1000);
      expect(release).not.toBeNull();

      try {
        // While holding the lock, try to run sync:branch
        // This should timeout and return a skip response
        const result = await syncBranchCmd(['feature/test']);
        const parsed = JSON.parse(result);

        // Should return skip response because lock is held
        expect(parsed.ok).toBe(true);
        expect(parsed.data?.action).toBe('skipped');
        expect(parsed.data?.reason).toContain('Lock held');
      } finally {
        // Release the lock
        if (release) await release();
      }
    }, 10000);

    it('processes sync:branch when lock is available', async () => {
      // When lock is available, sync:branch should execute
      // (It may fail for other reasons, but not due to lock)
      const result = JSON.parse(await syncBranchCmd(['feature/test']));

      // Should NOT be a lock skip
      if (result.ok === true && result.data?.action === 'skipped' && result.data?.reason?.includes('Lock')) {
        throw new Error('Unexpected lock skip when lock should be available');
      }

      // Result should have a defined status (either success or some error)
      expect(result.ok).toBeDefined();
    });
  });

  describe('direct lock acquisition', () => {
    it('acquireSyncLock returns null when lock is held', async () => {
      const lockPath = dbPath;

      // Acquire first lock
      const release1 = await acquireSyncLock(lockPath, 1000);
      expect(release1).not.toBeNull();

      // Try to acquire second lock (should fail/timeout)
      const release2 = await acquireSyncLock(lockPath, 100);
      expect(release2).toBeNull();

      // Release first lock
      if (release1) await release1();

      // Now should be able to acquire again
      const release3 = await acquireSyncLock(lockPath, 1000);
      expect(release3).not.toBeNull();
      if (release3) await release3();
    });

    it('acquireSyncLock allows sequential acquisitions', async () => {
      const lockPath = dbPath;

      // First acquisition
      const release1 = await acquireSyncLock(lockPath, 1000);
      expect(release1).not.toBeNull();
      if (release1) await release1();

      // Second acquisition after release
      const release2 = await acquireSyncLock(lockPath, 1000);
      expect(release2).not.toBeNull();
      if (release2) await release2();
    });
  });
});
