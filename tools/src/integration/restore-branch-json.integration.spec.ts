import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookPostCheckoutCmd } from '../cli/commands/hook-post-checkout.cmd.js';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { syncBranchCmd } from '../cli/commands/sync-branch.cmd.js';
import { GitCliAdapter } from '../infrastructure/adapters/git/git-cli.adapter.js';
import { createStateStores } from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

describe('restore-branch-json integration', () => {
  let tmpDir: string;
  let tffDir: string;
  let dbPath: string;
  let originalCwd: string;
  let gitOps: GitCliAdapter;
  let env: Record<string, string>;
  let currentBranch: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-restore-json-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    dbPath = join(tffDir, 'state.db');
    gitOps = new GitCliAdapter(tmpDir);

    // Change to temp directory so commands use the right paths
    process.chdir(tmpDir);

    // Initialize git repo
    env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'ignore', env });

    // Get current branch name
    currentBranch = execSync('git branch --show-current', {
      cwd: tmpDir,
      encoding: 'utf8',
    }).trim();

    // Ensure .tff directory exists before writing stamp
    mkdirSync(tffDir, { recursive: true });

    // Write synthetic stamp to avoid branch mismatch errors
    writeSyntheticStamp(tffDir, currentBranch);

    // Initialize project and create milestone
    const initResult = JSON.parse(await projectInitCmd(['test-project', 'Test project for restore json']));
    expect(initResult.ok).toBe(true);

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('JSON round-trip restore', () => {
    it('should restore SQLite from JSON state-snapshot after deleting local DB', async () => {
      // Verify local DB exists with data before sync
      expect(existsSync(dbPath)).toBe(true);

      const storesBefore = createStateStores(dbPath);
      const projectBefore = storesBefore.db.getProject();
      expect(projectBefore.ok).toBe(true);
      expect(projectBefore.data?.name).toBe('test-project');
      // Close before deletion
      storesBefore.db.close();

      // Delete state branch if it exists from previous test attempts
      try {
        execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
      } catch {
        // Branch might not exist, that's fine
      }

      // Create state branch with initial branch-meta.json
      execSync(`git checkout --orphan tff-state/${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

      const initialMeta = {
        stateId: 'test-state-id',
        codeBranch: currentBranch,
        parentStateBranch: null,
        createdAt: new Date().toISOString(),
      };
      writeFileSync(join(tmpDir, 'branch-meta.json'), JSON.stringify(initialMeta, null, 2));
      execSync('git add branch-meta.json', { cwd: tmpDir, stdio: 'ignore', env });
      execSync('git commit -m "init state branch"', { cwd: tmpDir, stdio: 'ignore', env });

      // Return to main branch
      execSync(`git checkout ${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

      // Run sync to export state to JSON on state branch
      const syncResult = JSON.parse(await syncBranchCmd([currentBranch]));
      expect(syncResult.ok).toBe(true);

      // Verify state-snapshot.json exists in state branch
      const stateBranch = `tff-state/${currentBranch}`;
      const fileResult = await gitOps.extractFile(stateBranch, '.tff/state-snapshot.json');
      expect(fileResult.ok).toBe(true);

      // Simulate crash/loss: delete local state.db
      rmSync(dbPath);
      expect(existsSync(dbPath)).toBe(false);

      // Clear the stamp file so hook-post-checkout will run restore
      const stampPath = join(tffDir, 'branch-meta.json');
      if (existsSync(stampPath)) {
        rmSync(stampPath);
      }

      // Run hook-post-checkout to restore from state branch
      const restoreResult = JSON.parse(await hookPostCheckoutCmd([currentBranch]));
      expect(restoreResult.ok).toBe(true);
      expect(restoreResult.data?.action).toBe('restored');

      // Verify SQLite is reconstructed and queryable
      expect(existsSync(dbPath)).toBe(true);

      const storesAfter = createStateStores(dbPath);

      // Verify project data is restored
      const projectAfter = storesAfter.db.getProject();
      expect(projectAfter.ok).toBe(true);
      expect(projectAfter.data).not.toBeNull();
      expect(projectAfter.data?.name).toBe('test-project');
      expect(projectAfter.data?.vision).toBe('Test project for restore json');

      // Verify milestone data is restored
      const milestonesAfter = storesAfter.milestoneStore.listMilestones();
      expect(milestonesAfter.ok).toBe(true);
      expect(milestonesAfter.data.length).toBeGreaterThan(0);
      expect(milestonesAfter.data[0]?.name).toBe('Test Milestone');

      storesAfter.db.close();
    }, 20000);

    it('should handle restore when no state branch exists', async () => {
      // Ensure no state branch exists
      try {
        execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
      } catch {
        // Branch might not exist, that's fine
      }

      // Run hook-post-checkout
      const restoreResult = JSON.parse(await hookPostCheckoutCmd([currentBranch]));
      expect(restoreResult.ok).toBe(true);
      expect(restoreResult.data?.action).toBe('skipped');
      expect(restoreResult.data?.reason).toContain('No state branch');
    }, 10000);

    it('should skip restore when stamp already matches', async () => {
      // Write a stamp that matches current branch
      writeSyntheticStamp(tffDir, currentBranch);

      // Run hook-post-checkout
      const restoreResult = JSON.parse(await hookPostCheckoutCmd([currentBranch]));
      expect(restoreResult.ok).toBe(true);
      expect(restoreResult.data?.action).toBe('skipped');
      expect(restoreResult.data?.reason).toContain('Stamp already matches');
    }, 10000);

    it('should produce valid and complete restored state', async () => {
      // Delete state branch if it exists
      try {
        execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
      } catch {
        // Branch might not exist, that's fine
      }

      // Create state branch with initial branch-meta.json
      execSync(`git checkout --orphan tff-state/${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

      const initialMeta = {
        stateId: 'test-state-id',
        codeBranch: currentBranch,
        parentStateBranch: null,
        createdAt: new Date().toISOString(),
      };
      writeFileSync(join(tmpDir, 'branch-meta.json'), JSON.stringify(initialMeta, null, 2));
      execSync('git add branch-meta.json', { cwd: tmpDir, stdio: 'ignore', env });
      execSync('git commit -m "init"', { cwd: tmpDir, stdio: 'ignore', env });
      execSync(`git checkout ${currentBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

      // Run sync to export state
      const syncResult = JSON.parse(await syncBranchCmd([currentBranch]));
      expect(syncResult.ok).toBe(true);

      // Get original state for comparison
      const storesOriginal = createStateStores(dbPath);
      const originalProject = storesOriginal.projectStore.getProject();
      const originalMilestones = storesOriginal.milestoneStore.listMilestones();
      storesOriginal.db.close();

      // Delete local DB
      rmSync(dbPath);

      // Clear stamp
      const stampPath = join(tffDir, 'branch-meta.json');
      if (existsSync(stampPath)) {
        rmSync(stampPath);
      }

      // Restore from state branch
      const restoreResult = JSON.parse(await hookPostCheckoutCmd([currentBranch]));
      expect(restoreResult.ok).toBe(true);
      expect(restoreResult.data?.action).toBe('restored');

      // Verify restored state matches original
      expect(existsSync(dbPath)).toBe(true);

      const storesRestored = createStateStores(dbPath);
      const restoredProject = storesRestored.projectStore.getProject();
      const restoredMilestones = storesRestored.milestoneStore.listMilestones();

      expect(restoredProject.data?.name).toBe(originalProject.data?.name);
      expect(restoredProject.data?.vision).toBe(originalProject.data?.vision);
      expect(restoredMilestones.data.length).toBe(originalMilestones.data.length);
      expect(restoredMilestones.data[0]?.name).toBe(originalMilestones.data[0]?.name);
      expect(restoredMilestones.data[0]?.status).toBe(originalMilestones.data[0]?.status);

      storesRestored.db.close();
    }, 20000);
  });
});
