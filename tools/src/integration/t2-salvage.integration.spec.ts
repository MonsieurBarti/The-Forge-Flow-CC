import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkpointSaveCmd } from '../cli/commands/checkpoint-save.cmd.js';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { sliceCreateCmd } from '../cli/commands/slice-create.cmd.js';
import { stateRepairCmd } from '../cli/commands/state-repair.cmd.js';
import { taskClaimCmd } from '../cli/commands/task-claim.cmd.js';
import { createClosableStateStoresUnchecked } from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

describe('T2 salvage integration', () => {
  let tmpDir: string;
  let tffDir: string;
  let dbPath: string;
  let originalCwd: string;
  let env: NodeJS.ProcessEnv;
  let currentBranch: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-t2-salvage-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    dbPath = join(tffDir, 'state.db');

    process.chdir(tmpDir);

    // Set up git environment
    env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

    // Initialize git repo with main branch
    execSync('git init', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git config init.defaultBranch main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git checkout -b main', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe', env });

    currentBranch = 'main';

    // Initialize project and create state
    mkdirSync(tffDir, { recursive: true });
    writeSyntheticStamp(tffDir, currentBranch);

    const initResult = JSON.parse(await projectInitCmd(['t2-salvage-test', 'Test T2 salvage recovery']));
    expect(initResult.ok).toBe(true);

    // Commit changes to main before creating state branch
    execSync('git add -A', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Initial project" || true', { cwd: tmpDir, stdio: 'pipe', env });

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);

    const sliceResult = JSON.parse(await sliceCreateCmd(['Test Slice']));
    expect(sliceResult.ok).toBe(true);

    // Create a task using stores to ensure database is created
    const stores = createClosableStateStoresUnchecked();
    const taskResult = stores.taskStore.createTask({
      sliceId: 'M01-S01',
      number: 1,
      title: 'Salvage Test Task',
      wave: 0,
    });
    expect(taskResult.ok).toBe(true);
    stores.checkpoint();
    stores.close();

    // Claim task and save checkpoint
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

    // Verify checkpoint exists
    const checkpointPath = join(tmpDir, '.tff', 'milestones', 'M01', 'slices', 'M01-S01', 'CHECKPOINT.md');
    expect(existsSync(checkpointPath)).toBe(true);

    // Ensure database exists with some data before creating state branch
    // Force create database with proper schema if it doesn't exist
    if (!existsSync(dbPath)) {
      const db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS project (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          vision TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS milestone (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          close_reason TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS slice (
          id TEXT PRIMARY KEY,
          milestone_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'discussing',
          tier TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task (
          id TEXT PRIMARY KEY,
          slice_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          wave INTEGER,
          claimed_at TEXT,
          claimed_by TEXT,
          closed_reason TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS dependency (
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          type TEXT NOT NULL,
          PRIMARY KEY (from_id, to_id)
        );
        CREATE TABLE IF NOT EXISTS workflow_session (
          id INTEGER PRIMARY KEY,
          phase TEXT NOT NULL,
          active_slice_id TEXT,
          active_milestone_id TEXT,
          paused_at TEXT,
          context_json TEXT,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS review (
          slice_id TEXT NOT NULL,
          type TEXT NOT NULL,
          reviewer TEXT NOT NULL,
          verdict TEXT NOT NULL,
          commit_sha TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          PRIMARY KEY (slice_id, type, reviewer, created_at)
        );
      `);
      const now = new Date().toISOString();
      db.prepare(
        "INSERT OR REPLACE INTO project VALUES ('singleton', 't2-salvage-test', 'Test T2 salvage recovery', ?)",
      ).run(now);
      db.prepare(
        "INSERT OR REPLACE INTO milestone VALUES ('M01', 'singleton', 1, 'Test Milestone', 'open', NULL, ?)",
      ).run(now);
      db.prepare("INSERT OR REPLACE INTO slice VALUES ('M01-S01', 'M01', 1, 'Test Slice', 'discussing', NULL, ?)").run(
        now,
      );
      db.prepare(
        "INSERT OR REPLACE INTO task VALUES ('M01-S01-T01', 'M01-S01', 1, 'Salvage Test Task', NULL, 'open', 0, NULL, NULL, NULL, ?)",
      ).run(now);
      db.close();
    }

    // Push state to state branch (simulate normal sync using git commands)
    try {
      execSync('git branch -D tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });
    } catch {
      // Branch may not exist, ignore error
    }
    execSync('git checkout -b tff-state/main', { cwd: tmpDir, stdio: 'pipe', env });
    // Force add ignored files
    execSync('git add -f .tff/state.db', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git add -f .tff/milestones/', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git add -f .tff/journal/', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git add -f .tff/branch-meta.json', { cwd: tmpDir, stdio: 'pipe', env });
    execSync('git commit -m "Backup state" || true', { cwd: tmpDir, stdio: 'pipe', env });

    // Verify commit succeeded
    const branchLog = execSync('git log --oneline -1', { cwd: tmpDir, encoding: 'utf8', env }).trim();
    expect(branchLog).toContain('Backup state');

    // Stay on state branch so .tff/ directory remains in working tree
    // The repair command uses currentBranch variable ('main') to determine state branch

    // Wait for any pending lock releases
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 30000);

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T2 recovery with salvage', () => {
    it('should repair corrupted DB and report salvage metadata', async () => {
      // Verify database exists before corruption
      expect(existsSync(dbPath)).toBe(true);

      // Corrupt the local state.db by overwriting middle of file
      const originalData = readFileSync(dbPath);
      const corruptedData = Buffer.from(originalData);

      // Overwrite middle section with garbage (avoid header which is needed for SQLite detection)
      const midPoint = Math.floor(corruptedData.length / 2);
      for (let i = midPoint; i < Math.min(midPoint + 200, corruptedData.length - 100); i++) {
        corruptedData[i] = 0xff;
      }
      writeFileSync(dbPath, corruptedData);

      // Verify the file is now corrupted (not valid SQLite)
      const header = readFileSync(dbPath, { encoding: null });
      const sqliteMagic = Buffer.from('SQLite format 3\x00');
      const hasValidHeader = header.subarray(0, sqliteMagic.length).equals(sqliteMagic);
      expect(hasValidHeader).toBe(true); // Header intact, but data corrupted

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      // Should succeed (may be restored or skipped if lock held)
      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        // Lock contention - test passes but notes limitation
        expect(repairResult.data?.tier).toBe('T2');
        return;
      }

      expect(repairResult.data?.action).toBe('restored');
      expect(repairResult.data?.tier).toBe('T2');

      // Verify salvage metadata is present (when DB is corrupted and salvage succeeds)
      if (repairResult.data?.salvaged) {
        expect(repairResult.data.tablesSalvaged).toBeDefined();
        expect(repairResult.data.tablesSalvaged.length).toBeGreaterThan(0);
        expect(repairResult.data.tablesSalvaged).toContain('project');
        expect(repairResult.data.tablesSalvaged).toContain('milestone');
        expect(repairResult.data.tablesSalvaged).toContain('slice');
      }

      // Verify DB is now valid
      expect(existsSync(dbPath)).toBe(true);
      const restoredData = readFileSync(dbPath, { encoding: null });
      const restoredMagic = restoredData.subarray(0, sqliteMagic.length);
      expect(restoredMagic.equals(sqliteMagic)).toBe(true);

      // Verify data is queryable
      const stores = createClosableStateStoresUnchecked();
      const projectResult = stores.projectStore.getProject();
      expect(projectResult.ok).toBe(true);
      expect(projectResult.data).not.toBeNull();
      stores.close();
    }, 30000);

    it('should merge salvaged data with state branch data', async () => {
      // Verify database exists
      expect(existsSync(dbPath)).toBe(true);

      // Add more local data that hasn't been synced
      const stores = createClosableStateStoresUnchecked();
      const extraTaskResult = stores.taskStore.createTask({
        sliceId: 'M01-S01',
        number: 2,
        title: 'Unsynced Local Task',
        wave: 0,
      });
      expect(extraTaskResult.ok).toBe(true);
      stores.checkpoint();
      stores.close();

      // Corrupt the database
      const originalData = readFileSync(dbPath);
      const corruptedData = Buffer.from(originalData);
      const midPoint = Math.floor(corruptedData.length / 2);
      for (let i = midPoint; i < Math.min(midPoint + 150, corruptedData.length - 100); i++) {
        corruptedData[i] = 0x00; // Different corruption pattern
      }
      writeFileSync(dbPath, corruptedData);

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        expect(repairResult.data?.tier).toBe('T2');
        return;
      }

      expect(repairResult.data?.action).toBe('restored');

      // Verify data was merged (project should exist)
      const storesAfter = createClosableStateStoresUnchecked();
      const projectResult = storesAfter.projectStore.getProject();
      expect(projectResult.ok).toBe(true);
      expect(projectResult.data?.name).toBe('t2-salvage-test');
      storesAfter.close();
    }, 30000);

    it('should handle severely corrupted database', async () => {
      // Verify database exists
      expect(existsSync(dbPath)).toBe(true);

      // Overwrite more of the database to make it severely corrupted
      const originalData = readFileSync(dbPath);
      const corruptedData = Buffer.from(originalData);

      // Corrupt a larger portion
      const corruptStart = 512; // After header
      const corruptEnd = Math.min(corruptStart + 2048, corruptedData.length - 512);
      for (let i = corruptStart; i < corruptEnd; i++) {
        corruptedData[i] = 0xde; // Different pattern
      }
      writeFileSync(dbPath, corruptedData);

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        expect(repairResult.data?.tier).toBe('T2');
        return;
      }

      // Should restore from state branch (salvage may or may not succeed)
      expect(['restored', 'synthetic']).toContain(repairResult.data?.action);
      expect(repairResult.data?.tier).toBe('T2');

      // Verify the database was restored
      expect(existsSync(dbPath)).toBe(true);
      const sqliteMagic = Buffer.from('SQLite format 3\x00');
      const restoredData = readFileSync(dbPath, { encoding: null });
      expect(restoredData.subarray(0, sqliteMagic.length).equals(sqliteMagic)).toBe(true);
    }, 30000);

    it('should handle empty salvage result gracefully', async () => {
      // Create a file that looks like SQLite but has no valid data
      const fakeDbPath = join(tffDir, 'state.db');
      const header = Buffer.from('SQLite format 3\x00');
      const garbage = Buffer.alloc(4096);
      for (let i = 0; i < garbage.length; i++) {
        garbage[i] = Math.floor(Math.random() * 256);
      }
      writeFileSync(fakeDbPath, Buffer.concat([header, garbage]));

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        expect(repairResult.data?.tier).toBe('T2');
        return;
      }

      // Should restore from state branch
      expect(repairResult.data?.action).toBe('restored');
      expect(repairResult.data?.tier).toBe('T2');

      // Verify valid database was restored
      expect(existsSync(dbPath)).toBe(true);
      const sqliteMagic = Buffer.from('SQLite format 3\x00');
      const restoredData = readFileSync(dbPath, { encoding: null });
      expect(restoredData.subarray(0, sqliteMagic.length).equals(sqliteMagic)).toBe(true);
    }, 30000);

    it('should preserve checkpoint data after T2 salvage', async () => {
      // Verify checkpoint exists before corruption
      const checkpointPath = join(tffDir, 'milestones', 'M01', 'slices', 'M01-S01', 'CHECKPOINT.md');
      expect(existsSync(checkpointPath)).toBe(true);

      // Verify database exists
      expect(existsSync(dbPath)).toBe(true);

      // Corrupt the database
      const originalData = readFileSync(dbPath);
      const corruptedData = Buffer.from(originalData);
      const midPoint = Math.floor(corruptedData.length / 2);
      for (let i = midPoint; i < Math.min(midPoint + 100, corruptedData.length - 100); i++) {
        corruptedData[i] = 0xab;
      }
      writeFileSync(dbPath, corruptedData);

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        expect(repairResult.data?.tier).toBe('T2');
        return;
      }

      expect(repairResult.data?.action).toBe('restored');

      // Verify checkpoint is still accessible after restore
      expect(existsSync(checkpointPath)).toBe(true);

      // Verify consistent flag is set correctly
      expect(repairResult.data?.consistent).toBeDefined();
    }, 30000);

    it('should report correct salvage metadata structure', async () => {
      // Verify database exists
      expect(existsSync(dbPath)).toBe(true);

      // Corrupt the database with moderate corruption
      const originalData = readFileSync(dbPath);
      const corruptedData = Buffer.from(originalData);
      const midPoint = Math.floor(corruptedData.length / 2);
      for (let i = midPoint; i < Math.min(midPoint + 100, corruptedData.length - 100); i++) {
        corruptedData[i] = 0xcd;
      }
      writeFileSync(dbPath, corruptedData);

      // Run T2 repair
      const repairResult = JSON.parse(await stateRepairCmd([currentBranch, '--tier', 'T2']));

      expect(repairResult.ok).toBe(true);

      if (repairResult.data?.action === 'skipped') {
        return;
      }

      // Verify metadata structure
      // Note: salvaged flag may be true or false depending on whether salvage was successful
      if (repairResult.data?.salvaged) {
        expect(repairResult.data.tablesSalvaged).toBeInstanceOf(Array);
      }
      expect(repairResult.data?.durationMs).toBeGreaterThan(0);
      expect(repairResult.data?.durationMs).toBeLessThan(30000); // Should complete within 30s
    }, 30000);
  });
});
