import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { sliceListCmd } from '../cli/commands/slice-list.cmd.js';
import { stateRepairCmd } from '../cli/commands/state-repair.cmd.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

describe('state-consistency-gate', () => {
  let tmpDir: string;
  let tffDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-state-gate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    mkdirSync(tffDir, { recursive: true });

    // Change to temp directory so commands use the right paths
    process.chdir(tmpDir);

    // Initialize git repo on 'main' branch
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'ignore', env });

    // Get current branch for stamp
    const currentBranch = execSync('git branch --show-current', {
      cwd: tmpDir,
      encoding: 'utf8',
    }).trim();

    // Write stamp BEFORE any operations to avoid mismatch errors during setup
    writeSyntheticStamp(tffDir, currentBranch);

    // Create state.db file (needed for proper-lockfile)
    writeFileSync(join(tffDir, 'state.db'), '');

    // Initialize project - stamp already matches so no mismatch error
    const initResult = JSON.parse(await projectInitCmd(['test-project', 'Test project for state gate']));
    expect(initResult.ok).toBe(true);

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('branch mismatch detection and repair flow', () => {
    it('BLOCKS operations with clear repair hint when stamp mismatches HEAD', async () => {
      // Simulate: we're on 'main' but stamp says 'M01-S01'
      // Write mismatched stamp (simulating wrong branch state)
      writeSyntheticStamp(tffDir, 'M01-S01');

      // Try to run a guarded command (slice:list uses withBranchGuard)
      const result = await sliceListCmd([]);
      const parsed = JSON.parse(result);

      // Should fail with branch mismatch error
      expect(parsed.ok).toBe(false);
      expect(parsed.error?.code).toBe('BRANCH_MISMATCH');
      expect(parsed.error?.message).toContain('M01-S01');
      expect(parsed.error?.message).toContain('main');
      expect(parsed.error?.repairHint).toBeDefined();
      expect(parsed.error?.repairHint).toContain('/tff:repair');
    });

    it('full gate→repair→operation flow succeeds', async () => {
      // Step 1: Setup - write mismatched stamp
      writeSyntheticStamp(tffDir, 'M01-S01');

      // Step 2: Verify guarded command BLOCKS with repair hint
      const blockedResult = await sliceListCmd([]);
      const blockedParsed = JSON.parse(blockedResult);

      expect(blockedParsed.ok).toBe(false);
      expect(blockedParsed.error?.code).toBe('BRANCH_MISMATCH');
      expect(blockedParsed.error?.repairHint).toContain('/tff:repair');
      expect(blockedParsed.error?.currentBranch).toBe('main');
      expect(blockedParsed.error?.expectedBranch).toBe('M01-S01');

      // Step 3: Run repair command to fix the mismatch
      const repairResult = await stateRepairCmd(['main']);
      const repairParsed = JSON.parse(repairResult);

      // Repair should succeed (either restored or synthetic)
      expect(repairParsed.ok).toBe(true);
      expect(repairParsed.data?.action).toMatch(/^(restored|synthetic|skipped)$/);

      // Step 4: Verify operation now succeeds
      const successResult = await sliceListCmd([]);
      const successParsed = JSON.parse(successResult);

      expect(successParsed.ok).toBe(true);
      expect(successParsed.data).toBeDefined();
      // Should return empty array since no slices created yet
      expect(Array.isArray(successParsed.data)).toBe(true);
    });

    it('repair is idempotent - running twice has no adverse effect', async () => {
      // Setup mismatch
      writeSyntheticStamp(tffDir, 'M01-S01');

      // First repair
      const repair1 = JSON.parse(await stateRepairCmd(['main']));
      expect(repair1.ok).toBe(true);

      // Second repair (should be skipped or succeed again)
      const repair2 = JSON.parse(await stateRepairCmd(['main']));
      expect(repair2.ok).toBe(true);
      expect(repair2.data?.action).toMatch(/^(skipped|restored|synthetic)$/);

      // Operation should still work
      const result = JSON.parse(await sliceListCmd([]));
      expect(result.ok).toBe(true);
    });

    it('error message includes stampPath for debugging', async () => {
      writeSyntheticStamp(tffDir, 'M01-S01');

      const result = await sliceListCmd([]);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error?.stampPath).toContain('.tff/branch-meta.json');
    });
  });
});
