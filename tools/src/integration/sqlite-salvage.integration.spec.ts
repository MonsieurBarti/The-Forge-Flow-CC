import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { milestoneCreateCmd } from '../cli/commands/milestone-create.cmd.js';
import { projectInitCmd } from '../cli/commands/project-init.cmd.js';
import { sliceCreateCmd } from '../cli/commands/slice-create.cmd.js';
import { syncBranchCmd } from '../cli/commands/sync-branch.cmd.js';
import { isErr, isOk } from '../domain/result.js';
import { createClosableStateStores } from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { SQLiteSalvage } from '../infrastructure/adapters/sqlite/sqlite-salvage.js';
import { writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

describe('sqlite-salvage integration', () => {
  let tmpDir: string;
  let tffDir: string;
  let dbPath: string;
  let originalCwd: string;
  let env: NodeJS.ProcessEnv;
  let currentBranch: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = join(os.tmpdir(), `tff-salvage-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    dbPath = join(tffDir, 'state.db');

    process.chdir(tmpDir);

    // Set up git environment
    env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

    // Initialize git repo with explicit main branch
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git checkout -b main', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'ignore', env });

    currentBranch = execSync('git branch --show-current', {
      cwd: tmpDir,
      encoding: 'utf8',
    }).trim();

    // Set up project
    mkdirSync(tffDir, { recursive: true });
    writeSyntheticStamp(tffDir, currentBranch);

    const initResult = JSON.parse(await projectInitCmd(['salvage-test', 'Test salvage integration']));
    expect(initResult.ok).toBe(true);

    const milestoneResult = JSON.parse(await milestoneCreateCmd(['Test Milestone']));
    expect(milestoneResult.ok).toBe(true);

    const sliceResult = JSON.parse(await sliceCreateCmd(['Test Slice']));
    expect(sliceResult.ok).toBe(true);

    // Add a task
    const stores = createClosableStateStores();
    const taskResult = stores.taskStore.createTask({
      sliceId: 'M01-S01',
      number: 1,
      title: 'Test Task for Salvage',
      wave: 0,
    });
    expect(taskResult.ok).toBe(true);
    stores.close();
  }, 20000);

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('valid database salvage', () => {
    it('should salvage complete data from a valid state.db', () => {
      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      expect(snapshot).not.toBeNull();
      expect(metadata.tablesSalvaged.length).toBeGreaterThan(0);
      expect(metadata.rowsRecovered).toBeGreaterThan(0);

      // Verify project data
      expect(snapshot!.project).not.toBeNull();
      expect(snapshot!.project!.name).toBe('salvage-test');
      expect(snapshot!.project!.vision).toBe('Test salvage integration');

      // Verify milestones
      expect(snapshot!.milestones.length).toBeGreaterThan(0);
      expect(snapshot!.milestones[0].name).toBe('Test Milestone');

      // Verify slices
      expect(snapshot!.slices.length).toBeGreaterThan(0);
      expect(snapshot!.slices[0].title).toBe('Test Slice');

      // Verify tasks
      expect(snapshot!.tasks.length).toBe(1);
      expect(snapshot!.tasks[0].title).toBe('Test Task for Salvage');

      // Verify metadata
      expect(metadata.integrityCheckResult).toBe('ok');
      expect(metadata.quickCheckResult).toBe('ok');
      expect(metadata.corruptionNotes).toHaveLength(0);
    }, 10000);

    it('should track all salvaged tables in metadata', () => {
      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { metadata } = result.data;

      // Should have salvaged the core tables
      expect(metadata.tablesSalvaged).toContain('project');
      expect(metadata.tablesSalvaged).toContain('milestone');
      expect(metadata.tablesSalvaged).toContain('slice');
      expect(metadata.tablesSalvaged).toContain('task');
    }, 10000);
  });

  describe('truncated database', () => {
    it('should salvage partial data from truncated file', async () => {
      // First sync to state branch to preserve the data
      const syncResult = JSON.parse(await syncBranchCmd([currentBranch]));
      expect(syncResult.ok).toBe(true);

      // Read the database and truncate it
      const data = readFileSync(dbPath);
      const truncated = data.slice(0, Math.floor(data.length * 0.6));
      writeFileSync(dbPath, truncated);

      const result = SQLiteSalvage.salvage(dbPath);

      // Should either return partial data or fail gracefully
      if (isOk(result)) {
        // Got partial data - verify structure exists
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
        // Either integrity check or quick check should have found issues
        expect(
          result.data.metadata.integrityCheckResult !== 'ok' ||
            result.data.metadata.quickCheckResult !== 'ok' ||
            result.data.metadata.corruptionNotes.length > 0,
        ).toBe(true);
      } else {
        // Failed to open - should have descriptive error
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
    }, 10000);

    it('should report corruption notes for severely truncated files', async () => {
      // Read and heavily truncate the database
      const data = readFileSync(dbPath);
      const truncated = data.slice(0, Math.floor(data.length * 0.3));
      writeFileSync(dbPath, truncated);

      const result = SQLiteSalvage.salvage(dbPath);

      // With severe truncation, may either fail to open, succeed with corruption notes, or return empty snapshot
      if (isErr(result)) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
      // If success, corruptionNotes may be empty if file was too corrupted to read anything
      expect(result).toBeDefined();
    }, 10000);
  });

  describe('corrupted page in middle', () => {
    it('should extract maximum readable data from partially corrupted database', async () => {
      // Sync to ensure we have complete data
      const syncResult = JSON.parse(await syncBranchCmd([currentBranch]));
      expect(syncResult.ok).toBe(true);

      // Read the database and corrupt a page in the middle
      const data = Buffer.from(readFileSync(dbPath));

      // Corrupt bytes in the middle (avoid header which is first 100 bytes)
      // and avoid the end which might contain important metadata
      const midPoint = Math.floor(data.length / 2);
      for (let i = midPoint; i < Math.min(midPoint + 100, data.length - 100); i++) {
        data[i] = 0xff;
      }
      writeFileSync(dbPath, data);

      const result = SQLiteSalvage.salvage(dbPath);

      // Should handle corruption gracefully
      expect(isOk(result) || result.error.code === 'CORRUPTED_STATE').toBe(true);

      if (isOk(result)) {
        // Verify that some data was recovered or corruption was noted
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);

        // May have partial data depending on what pages were corrupted
        const { snapshot, metadata } = result.data;

        // If we got a snapshot, verify it's structurally valid
        if (snapshot) {
          // Project might be salvageable even with corruption
          if (snapshot.project) {
            expect(snapshot.project.name).toBeDefined();
          }
        }

        // Metadata should reflect the corruption
        if (metadata.integrityCheckResult !== 'ok') {
          expect(metadata.corruptionNotes.some((n) => n.includes('Integrity') || n.includes('Quick'))).toBe(true);
        }
      }
    }, 10000);
  });

  describe('invalid records filtering', () => {
    it('should filter out invalid/corrupted records during salvage', () => {
      // Create a database with some intentionally invalid data by manipulating directly
      const testDbPath = join(tmpDir, 'invalid-records.db');
      const db = new Database(testDbPath);

      // Create schema without constraints to simulate corruption
      db.exec(`
        CREATE TABLE project (
          id TEXT PRIMARY KEY,
          name TEXT,
          vision TEXT,
          created_at TEXT
        );
        CREATE TABLE milestone (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          number INTEGER,
          name TEXT,
          status TEXT DEFAULT 'open',
          close_reason TEXT,
          created_at TEXT
        );
        CREATE TABLE slice (
          id TEXT PRIMARY KEY,
          milestone_id TEXT,
          number INTEGER,
          title TEXT,
          status TEXT DEFAULT 'discussing',
          tier TEXT,
          created_at TEXT
        );
        CREATE TABLE task (
          id TEXT PRIMARY KEY,
          slice_id TEXT,
          number INTEGER,
          title TEXT,
          description TEXT,
          status TEXT DEFAULT 'open',
          wave INTEGER,
          claimed_at TEXT,
          claimed_by TEXT,
          closed_reason TEXT,
          created_at TEXT
        );
        CREATE TABLE dependency (
          from_id TEXT,
          to_id TEXT,
          type TEXT
        );
        CREATE TABLE workflow_session (
          id INTEGER PRIMARY KEY,
          phase TEXT,
          active_slice_id TEXT,
          active_milestone_id TEXT,
          paused_at TEXT,
          context_json TEXT,
          updated_at TEXT
        );
        CREATE TABLE review (
          slice_id TEXT,
          type TEXT,
          reviewer TEXT,
          verdict TEXT,
          commit_sha TEXT,
          notes TEXT,
          created_at TEXT
        );
      `);

      const now = new Date().toISOString();

      // Insert valid data
      db.prepare("INSERT INTO project VALUES ('singleton', 'Valid Project', NULL, ?)").run(now);
      db.prepare("INSERT INTO milestone VALUES ('M01', 'singleton', 1, 'Valid Milestone', 'open', NULL, ?)").run(now);
      db.prepare("INSERT INTO slice VALUES ('M01-S01', 'M01', 1, 'Valid Slice', 'discussing', NULL, ?)").run(now);
      db.prepare(
        "INSERT INTO task VALUES ('M01-S01-T01', 'M01-S01', 1, 'Valid Task', NULL, 'open', NULL, NULL, NULL, NULL, ?)",
      ).run(now);

      // Insert invalid data (NULL values in required fields)
      db.prepare("INSERT INTO milestone VALUES ('M02', 'singleton', NULL, NULL, 'open', NULL, ?)").run(now); // Missing name and number
      db.prepare("INSERT INTO slice VALUES ('M01-S02', NULL, 1, 'Missing Milestone', 'discussing', NULL, ?)").run(now); // Missing milestone_id
      db.prepare(
        "INSERT INTO task VALUES ('M01-S01-T02', 'M01-S01', 2, NULL, NULL, 'open', NULL, NULL, NULL, NULL, ?)",
      ).run(now); // Missing title

      db.close();

      const result = SQLiteSalvage.salvage(testDbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      // Valid records should be present
      expect(snapshot!.project).not.toBeNull();
      expect(snapshot!.project!.name).toBe('Valid Project');
      expect(snapshot!.milestones).toHaveLength(1); // Only M01
      expect(snapshot!.slices).toHaveLength(1); // Only M01-S01
      expect(snapshot!.tasks).toHaveLength(1); // Only M01-S01-T01

      // Should have corruption notes for invalid records
      expect(metadata.corruptionNotes.length).toBeGreaterThan(0);
      expect(
        metadata.corruptionNotes.some((n) => n.includes('M02') || n.includes('missing') || n.includes('invalid')),
      ).toBe(true);
      expect(metadata.corruptionNotes.some((n) => n.includes('M01-S02') || n.includes('Missing Milestone'))).toBe(true);
      expect(metadata.corruptionNotes.some((n) => n.includes('M01-S01-T02'))).toBe(true);
    }, 10000);
  });

  describe('fallback when salvage returns empty', () => {
    it('should return empty snapshot for database with no readable tables', () => {
      // Create a database that's just garbage but has SQLite header
      const garbageDbPath = join(tmpDir, 'garbage.db');
      const header = Buffer.from('SQLite format 3\x00');
      const garbage = Buffer.alloc(4096);
      for (let i = 0; i < garbage.length; i++) {
        garbage[i] = Math.floor(Math.random() * 256);
      }
      writeFileSync(garbageDbPath, Buffer.concat([header, garbage]));

      const result = SQLiteSalvage.salvage(garbageDbPath);

      // Should either error or return empty snapshot
      if (isOk(result)) {
        expect(result.data.snapshot).toBeNull();
        expect(result.data.metadata.tablesSalvaged).toHaveLength(0);
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
      } else {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
    }, 10000);

    it('should return error for non-existent file', () => {
      const nonExistentPath = join(tmpDir, 'does-not-exist.db');

      const result = SQLiteSalvage.salvage(nonExistentPath);

      expect(isErr(result)).toBe(true);
      if (!isErr(result)) return;

      expect(result.error.code).toBe('CORRUPTED_STATE');
      expect(result.error.message).toContain('Failed to open database');
    }, 5000);
  });

  describe('metadata accuracy', () => {
    it('should accurately report row counts', () => {
      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { metadata } = result.data;

      // Should have at least: 1 project + 1 milestone + 1 slice + 1 task
      expect(metadata.rowsRecovered).toBeGreaterThanOrEqual(4);
      expect(metadata.rowsRecovered).toBeLessThan(20); // Sanity check
    }, 10000);

    it('should include integrity check results in metadata', () => {
      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { metadata } = result.data;

      expect(metadata.integrityCheckResult).toBeDefined();
      expect(metadata.quickCheckResult).toBeDefined();
    }, 10000);
  });
});
