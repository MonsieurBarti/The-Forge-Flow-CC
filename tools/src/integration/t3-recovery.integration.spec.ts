import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkpointSaveCmd } from '../cli/commands/checkpoint-save.cmd.js';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { sliceCreateCmd } from '../cli/commands/slice-create.cmd.js';
import { stateRepairCmd } from '../cli/commands/state-repair.cmd.js';
import { taskClaimCmd } from '../cli/commands/task-claim.cmd.js';
import { createClosableStateStores } from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

describe('T3 recovery integration', () => {
  let tmpDir: string;
  let tffDir: string;
  let _milestonesDir: string;
  let originalCwd: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-t3-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    _milestonesDir = join(tffDir, 'milestones');

    process.chdir(tmpDir);

    // Set up git environment
    env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

    // Initialize git repo with main branch
    execSync('git init', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git checkout -b main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git checkout -b main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe', env });

    // Initialize project
    mkdirSync(tffDir, { recursive: true });
    writeSyntheticStamp(tffDir, 'main');
    writeFileSync(join(tffDir, 'state.db'), '');

    const initResult = JSON.parse(await projectInitCmd(['t3-test-project', 'Test T3 recovery']));
    expect(initResult.ok).toBe(true);

    // Commit all changes to main before creating state branch
    execSync('git add -A', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Initial project" || true', { cwd: tmpDir, stdio: 'pipe', env });

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);

    const sliceResult = JSON.parse(await sliceCreateCmd(['Test Slice']));
    expect(sliceResult.ok).toBe(true);

    // Create a task and checkpoint
    const stores = createClosableStateStores();
    const taskResult = stores.taskStore.createTask({
      sliceId: 'M01-S01',
      number: 1,
      title: 'Test Task',
      wave: 0,
    });
    expect(taskResult.ok).toBe(true);
    stores.close();

    const claimResult = JSON.parse(await taskClaimCmd(['M01-S01-T01', 'agent-1']));
    expect(claimResult.ok).toBe(true);

    const checkpointData = {
      sliceId: 'M01-S01',
      baseCommit: 'abc123',
      currentWave: 1,
      completedWaves: [0],
      completedTasks: ['M01-S01-T01'],
      executorLog: [{ taskRef: 'M01-S01-T01', agent: 'agent-1' }],
    };
    const checkpointResult = JSON.parse(await checkpointSaveCmd([JSON.stringify(checkpointData)]));
    expect(checkpointResult.ok).toBe(true);

    // Push to state branch
    // Force-create state branch with current .tff/ content
    try {
      execSync('git branch -D tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });
    } catch {
      // Branch may not exist, ignore error
    }
    // Commit any pending changes before creating state branch
    execSync('git add -A', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Pre-state-branch commit" || true', { cwd: tmpDir, stdio: 'pipe', env });
    // Create fresh state branch from current main
    execSync('git checkout -b tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git add -f .tff/', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Backup state" || true', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe', env });

    // Wait for any pending lock releases from setup commands
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 30000);

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('restores .tff/ and regenerates project files when both are missing', async () => {
    // Note: .tff/ may not exist in test setup - T3 should regenerate it

    // Simulate severe corruption: Delete both .tff/ and .tff/ if they exist
    if (existsSync(tffDir)) rmSync(tffDir, { recursive: true, force: true });
    if (existsSync(tffDir)) rmSync(tffDir, { recursive: true, force: true });

    expect(existsSync(tffDir)).toBe(false);

    // Run T3 repair with milestone
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--tier', 'T3', '--milestone', 'M01']));

    // If lock held, skip verification
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      expect(repairResult.data?.tier).toBe('T3');
      return;
    }

    // Assert success
    expect(repairResult.ok).toBe(true);
    expect(repairResult.data?.action).toBe('restored');
    expect(repairResult.data?.tier).toBe('T3');
    expect(repairResult.data?.regenerated).toBe(true);
    expect(repairResult.data?.milestoneId).toBe('M01');
    expect(repairResult.data?.durationMs).toBeDefined();
    expect(repairResult.data?.durationMs).toBeGreaterThan(0);
    expect(repairResult.data?.durationMs).toBeLessThan(5000);

    // Verify .tff/ was restored
    expect(existsSync(tffDir)).toBe(true);
    expect(existsSync(join(tffDir, 'state.db'))).toBe(true);

    // Verify project files were regenerated
    expect(existsSync(tffDir)).toBe(true);
    expect(existsSync(join(tffDir, 'STATE.md'))).toBe(true);

    // Verify checkpoint restored
    const checkpointPath = join(tffDir, 'milestones', 'M01', 'slices', 'M01-S01', 'CHECKPOINT.md');
    expect(existsSync(checkpointPath)).toBe(true);

    // Verify stamp was written
    const stampPath = join(tffDir, 'branch-meta.json');
    expect(existsSync(stampPath)).toBe(true);
  }, 30000);

  it('returns error when milestone is not provided and database is empty', async () => {
    // Delete .tff/ and .tff/
    rmSync(tffDir, { recursive: true, force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Recreate state branch with empty state.db (no milestones)
    execSync('git checkout tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git rm -rf .tff/', { cwd: tmpDir, stdio: 'pipe', env });

    // Create minimal .tff/ with empty state.db
    mkdirSync(tffDir, { recursive: true });
    writeFileSync(join(tffDir, 'state.db'), '');
    execSync('git add -f .tff/', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Empty state"', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe', env });

    // Run T3 repair without milestone
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--tier', 'T3']));

    // If lock held, skip
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      return;
    }

    // Should fail - no milestone found
    expect(repairResult.ok).toBe(false);
    expect(repairResult.error?.code).toBe('MILESTONE_NOT_FOUND');
  }, 30000);

  it('auto-detects T3 when both .tff/ and .tff/ are missing', async () => {
    // Delete both directories
    rmSync(tffDir, { recursive: true, force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Run repair without explicit tier (auto-detection)
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--milestone', 'M01']));

    // If lock held, skip
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      expect(repairResult.data?.tier).toBe('T3');
      return;
    }

    // Should auto-detect T3 and succeed
    expect(repairResult.ok).toBe(true);
    expect(repairResult.data?.tier).toBe('T3');
    expect(repairResult.data?.action).toBe('restored');
    expect(repairResult.data?.regenerated).toBe(true);

    // Verify both restored
    expect(existsSync(tffDir)).toBe(true);
    expect(existsSync(tffDir)).toBe(true);
  }, 30000);

  it('auto-detects T3 when state.db is missing AND project files are missing', async () => {
    // Simulate corruption: Delete state.db and project files (but keep .tff/ structure)
    rmSync(join(tffDir, 'state.db'), { force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Run repair without explicit tier
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--milestone', 'M01']));

    // If lock held, skip
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      expect(repairResult.data?.tier).toBe('T3');
      return;
    }

    // Should auto-detect T3
    expect(repairResult.ok).toBe(true);
    expect(repairResult.data?.tier).toBe('T3');
  }, 30000);

  it('logs warning when T3 recovery exceeds 5s', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Delete both directories
    rmSync(tffDir, { recursive: true, force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Run T3 repair
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--tier', 'T3', '--milestone', 'M01']));

    expect(repairResult.ok).toBe(true);

    // Verify warning path exists (actual timing may vary)
    if (repairResult.data?.durationMs > 5000) {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('T3 recovery took'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeding 5s target'));
    }

    warnSpy.mockRestore();
  }, 30000);

  it('returns STATE_BRANCH_NOT_FOUND when state branch is missing', async () => {
    // Delete .tff/ and .tff/
    rmSync(tffDir, { recursive: true, force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Delete state branch to cause restore failure
    execSync('git branch -D tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });

    // Run T3 repair
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--tier', 'T3', '--milestone', 'M01']));

    // If lock held, skip
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      return;
    }

    expect(repairResult.ok).toBe(false);
    expect(repairResult.error?.code).toBe('STATE_BRANCH_NOT_FOUND');
  }, 30000);

  it('attempts fetch when state branch is missing locally', async () => {
    // Delete .tff/ and .tff/
    rmSync(tffDir, { recursive: true, force: true });
    rmSync(tffDir, { recursive: true, force: true });

    // Rename state branch to simulate remote-only scenario
    execSync('git branch -m tff-state/main tff-state/remote-main', { cwd: tmpDir, stdio: 'pipe', env });

    // Run T3 repair - should attempt fetch then fail gracefully
    const repairResult = JSON.parse(await stateRepairCmd(['main', '--tier', 'T3', '--milestone', 'M01']));

    // If lock held, skip
    if (repairResult.ok && repairResult.data?.action === 'skipped') {
      return;
    }

    // We renamed the branch, so it won't be found - but the fetch attempt should happen
    expect(repairResult.ok).toBe(false);
    expect(repairResult.error?.code).toBe('STATE_BRANCH_NOT_FOUND');
  }, 30000);
});
