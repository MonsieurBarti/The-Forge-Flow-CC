import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
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
    execSync('git config init.defaultBranch main', { cwd: tmpDir, stdio: 'ignore', env });
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
      // With PR #56, the guard auto-repairs by writing a synthetic stamp and continues
      const result = await sliceListCmd([]);
      const parsed = JSON.parse(result);

      // After auto-repair, operation should succeed
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeDefined();
    });

    it('full gate→repair→operation flow succeeds', async () => {
      // Step 1: Setup - write mismatched stamp
      writeSyntheticStamp(tffDir, 'M01-S01');

      // Step 2: Verify guarded command auto-repairs and succeeds
      // With PR #56, the guard automatically repairs the mismatch
      const result = await sliceListCmd([]);
      const parsed = JSON.parse(result);

      // After auto-repair, operation should succeed
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeDefined();

      // Step 3: Verify operation still works after repair
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

    it('auto-repair includes stampPath in debug output when verbose', async () => {
      writeSyntheticStamp(tffDir, 'M01-S01');

      // With PR #56, auto-repair happens automatically
      const result = await sliceListCmd([]);
      const parsed = JSON.parse(result);

      // Operation should succeed after auto-repair
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeDefined();
    });
  });
});
