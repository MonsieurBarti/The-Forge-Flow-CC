import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import Database from 'better-sqlite3';
import { SQLiteSalvage } from './sqlite-salvage.js';
import { isOk, isErr } from '../../../domain/result.js';

describe('SQLiteSalvage', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-salvage-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create a valid SQLite database with sample data
   */
  function createValidDatabase(): string {
    const dbPath = path.join(tempDir, 'valid.db');
    const db = new Database(dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE project (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vision TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE milestone (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        close_reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE slice (
        id TEXT PRIMARY KEY,
        milestone_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'discussing',
        tier TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE task (
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

      CREATE TABLE dependency (
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (from_id, to_id)
      );

      CREATE TABLE workflow_session (
        id INTEGER PRIMARY KEY,
        phase TEXT NOT NULL,
        active_slice_id TEXT,
        active_milestone_id TEXT,
        paused_at TEXT,
        context_json TEXT,
        updated_at TEXT
      );

      CREATE TABLE review (
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

    // Insert sample data
    const now = new Date().toISOString();

    db.prepare("INSERT INTO project VALUES ('singleton', 'Test Project', 'Test Vision', ?)").run(now);

    db.prepare("INSERT INTO milestone VALUES ('M01', 'singleton', 1, 'Milestone 1', 'open', NULL, ?)").run(now);
    db.prepare("INSERT INTO milestone VALUES ('M02', 'singleton', 2, 'Milestone 2', 'open', NULL, ?)").run(now);

    db.prepare("INSERT INTO slice VALUES ('M01-S01', 'M01', 1, 'Slice 1', 'discussing', 'T1', ?)").run(now);
    db.prepare("INSERT INTO slice VALUES ('M01-S02', 'M01', 2, 'Slice 2', 'discussing', NULL, ?)").run(now);

    db.prepare("INSERT INTO task VALUES ('M01-S01-T01', 'M01-S01', 1, 'Task 1', 'Description', 'open', 1, NULL, NULL, NULL, ?)").run(now);
    db.prepare("INSERT INTO task VALUES ('M01-S01-T02', 'M01-S01', 2, 'Task 2', NULL, 'open', NULL, NULL, NULL, NULL, ?)").run(now);

    db.prepare("INSERT INTO dependency VALUES ('M01-S01-T02', 'M01-S01-T01', 'blocks')").run();

    db.prepare("INSERT INTO workflow_session VALUES (1, 'executing', 'M01-S01', 'M01', NULL, NULL, ?)").run(now);

    db.prepare("INSERT INTO review VALUES ('M01-S01', 'code', 'agent-a', 'approved', 'abc123', 'Looks good', ?)").run(now);

    db.close();
    return dbPath;
  }

  describe('valid database', () => {
    it('should salvage all data from a valid database', () => {
      const dbPath = createValidDatabase();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      expect(snapshot).not.toBeNull();
      expect(metadata.tablesSalvaged).toHaveLength(7);
      expect(metadata.corruptionNotes).toHaveLength(0);
      expect(metadata.integrityCheckResult).toBe('ok');
      expect(metadata.quickCheckResult).toBe('ok');

      // Verify project
      expect(snapshot!.project).not.toBeNull();
      expect(snapshot!.project!.name).toBe('Test Project');
      expect(snapshot!.project!.vision).toBe('Test Vision');

      // Verify milestones
      expect(snapshot!.milestones).toHaveLength(2);
      expect(snapshot!.milestones[0].name).toBe('Milestone 1');
      expect(snapshot!.milestones[1].name).toBe('Milestone 2');

      // Verify slices
      expect(snapshot!.slices).toHaveLength(2);
      expect(snapshot!.slices[0].title).toBe('Slice 1');
      expect(snapshot!.slices[1].title).toBe('Slice 2');

      // Verify tasks
      expect(snapshot!.tasks).toHaveLength(2);
      expect(snapshot!.tasks[0].title).toBe('Task 1');
      expect(snapshot!.tasks[0].description).toBe('Description');

      // Verify dependencies
      expect(snapshot!.dependencies).toHaveLength(1);
      expect(snapshot!.dependencies[0].fromId).toBe('M01-S01-T02');
      expect(snapshot!.dependencies[0].toId).toBe('M01-S01-T01');

      // Verify session
      expect(snapshot!.workflowSession).not.toBeNull();
      expect(snapshot!.workflowSession!.phase).toBe('executing');

      // Verify reviews
      expect(snapshot!.reviews).toHaveLength(1);
      expect(snapshot!.reviews[0].type).toBe('code');
      expect(snapshot!.reviews[0].verdict).toBe('approved');
    });

    it('should include correct row counts in metadata', () => {
      const dbPath = createValidDatabase();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      expect(result.data.metadata.rowsRecovered).toBe(10); // 1 project + 2 milestones + 2 slices + 2 tasks + 1 dependency + 1 session + 1 review
    });

    it('should set exportedAt timestamp', () => {
      const dbPath = createValidDatabase();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      expect(result.data.snapshot!.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('empty database', () => {
    it('should handle empty tables gracefully', () => {
      const dbPath = path.join(tempDir, 'empty.db');
      const db = new Database(dbPath);

      // Create tables but no data
      db.exec(`
        CREATE TABLE project (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          vision TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE milestone (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          close_reason TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE slice (
          id TEXT PRIMARY KEY,
          milestone_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'discussing',
          tier TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE task (
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
        CREATE TABLE dependency (
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          type TEXT NOT NULL,
          PRIMARY KEY (from_id, to_id)
        );
        CREATE TABLE workflow_session (
          id INTEGER PRIMARY KEY,
          phase TEXT NOT NULL,
          active_slice_id TEXT,
          active_milestone_id TEXT,
          paused_at TEXT,
          context_json TEXT,
          updated_at TEXT
        );
        CREATE TABLE review (
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

      db.close();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      // Should still get a snapshot with empty arrays
      expect(snapshot).not.toBeNull();
      expect(snapshot!.project).toBeNull();
      expect(snapshot!.milestones).toEqual([]);
      expect(snapshot!.slices).toEqual([]);
      expect(snapshot!.tasks).toEqual([]);
      expect(snapshot!.dependencies).toEqual([]);
      expect(snapshot!.workflowSession).toBeNull();
      expect(snapshot!.reviews).toEqual([]);

      // All tables should be marked as salvaged (queries succeeded)
      expect(metadata.tablesSalvaged).toContain('milestone');
      expect(metadata.tablesSalvaged).toContain('slice');
      expect(metadata.tablesSalvaged).toContain('task');
      expect(metadata.tablesSalvaged).toContain('dependency');
      expect(metadata.rowsRecovered).toBe(0);
    });
  });

  describe('corrupted header', () => {
    it('should handle corrupted header gracefully', () => {
      const dbPath = path.join(tempDir, 'corrupted-header.db');

      // Write a file that starts with "SQLite format 3" header but is garbage
      const header = Buffer.from('SQLite format 3\x00');
      const garbage = Buffer.alloc(2048);
      for (let i = 0; i < garbage.length; i++) {
        garbage[i] = Math.floor(Math.random() * 256);
      }
      fs.writeFileSync(dbPath, Buffer.concat([header, garbage]));

      const result = SQLiteSalvage.salvage(dbPath);

      // Depending on better-sqlite3 behavior, this may either fail to open
      // or open but fail during queries. Both are acceptable.
      if (isErr(result)) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      } else {
        // If it opened, should have corruption notes
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
      }
    });

    it('should handle completely non-SQLite file', () => {
      const dbPath = path.join(tempDir, 'not-sqlite.db');
      fs.writeFileSync(dbPath, 'This is not a SQLite database file at all, just plain text content here');

      const result = SQLiteSalvage.salvage(dbPath);

      // better-sqlite3 behavior: it may either fail to open, or it may try
      // to open the file and fail later during queries. Both are valid outcomes.
      if (isErr(result)) {
        expect(result.error.code).toBe('CORRUPTED_STATE');
      } else {
        // If it somehow opened, it should have corruption notes
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('truncated database', () => {
    it('should salvage partial data from truncated file', () => {
      const dbPath = createValidDatabase();

      // Read the valid database and truncate it
      const data = fs.readFileSync(dbPath);
      const truncated = data.slice(0, Math.floor(data.length * 0.6));
      fs.writeFileSync(dbPath, truncated);

      const result = SQLiteSalvage.salvage(dbPath);

      // Depending on where truncation happens, we may get partial data or error
      // The key is we handle it gracefully without crashing
      if (isOk(result)) {
        // Got partial data - verify structure
        expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
      } else {
        // Failed to open - should have descriptive error
        expect(result.error.code).toBe('CORRUPTED_STATE');
      }
    });
  });

  describe('missing required fields', () => {
    it('should skip rows with missing required fields and log corruption notes', () => {
      const dbPath = path.join(tempDir, 'missing-fields.db');
      const db = new Database(dbPath);

      // Create tables WITHOUT NOT NULL constraints to allow inserting invalid data
      // This simulates corruption where constraints were bypassed or schema was altered
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

      // Insert valid project
      db.prepare("INSERT INTO project VALUES ('singleton', 'Valid Project', NULL, ?)").run(now);

      // Insert milestones with some missing fields (simulating corruption)
      db.prepare("INSERT INTO milestone VALUES ('M01', 'singleton', 1, 'Valid Milestone', 'open', NULL, ?)").run(now);
      db.prepare("INSERT INTO milestone VALUES ('M02', 'singleton', NULL, NULL, 'open', NULL, ?)").run(now); // Missing name and number

      // Insert slices with some missing required fields
      db.prepare("INSERT INTO slice VALUES ('M01-S01', 'M01', 1, 'Valid Slice', 'discussing', NULL, ?)").run(now);
      db.prepare("INSERT INTO slice VALUES ('M01-S02', NULL, 1, 'Missing Milestone', 'discussing', NULL, ?)").run(now); // Missing milestone_id
      db.prepare("INSERT INTO slice VALUES (NULL, 'M01', 2, 'Missing ID', 'discussing', NULL, ?)").run(now); // Null ID - use empty string since NULL is special in SQLite

      db.close();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      // Should have project and valid milestone
      expect(snapshot!.project).not.toBeNull();
      expect(snapshot!.project!.name).toBe('Valid Project');

      // Only valid milestone should be salvaged
      expect(snapshot!.milestones).toHaveLength(1);
      expect(snapshot!.milestones[0].id).toBe('M01');

      // Only valid slice should be salvaged (M01-S01)
      expect(snapshot!.slices).toHaveLength(1);
      expect(snapshot!.slices[0].id).toBe('M01-S01');

      // Should have corruption notes for invalid rows
      expect(metadata.corruptionNotes.some(n => n.includes('M02'))).toBe(true);
      // M01-S02 has missing milestone_id - check for slice id in notes
      expect(metadata.corruptionNotes.some(n => n.includes('M01-S02'))).toBe(true);
    });
  });

  describe('invalid date parsing', () => {
    it('should handle invalid dates with fallback', () => {
      const dbPath = path.join(tempDir, 'invalid-dates.db');
      const db = new Database(dbPath);

      db.exec(`
        CREATE TABLE project (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          vision TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE milestone (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          close_reason TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE slice (
          id TEXT PRIMARY KEY,
          milestone_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'discussing',
          tier TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE task (
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
        CREATE TABLE dependency (
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          type TEXT NOT NULL,
          PRIMARY KEY (from_id, to_id)
        );
        CREATE TABLE workflow_session (
          id INTEGER PRIMARY KEY,
          phase TEXT NOT NULL,
          active_slice_id TEXT,
          active_milestone_id TEXT,
          paused_at TEXT,
          context_json TEXT,
          updated_at TEXT
        );
        CREATE TABLE review (
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

      // Insert with various invalid dates
      db.prepare("INSERT INTO project VALUES ('singleton', 'Test', NULL, 'not-a-date')").run();
      db.prepare("INSERT INTO milestone VALUES ('M01', 'singleton', 1, 'M1', 'open', NULL, 'invalid')").run();
      db.prepare("INSERT INTO slice VALUES ('M01-S01', 'M01', 1, 'S1', 'discussing', NULL, '')").run();

      db.close();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const { snapshot, metadata } = result.data;

      // Should still have the data with fallback dates
      expect(snapshot!.project).not.toBeNull();
      expect(snapshot!.project!.createdAt).toBeInstanceOf(Date);

      // Should have corruption notes about the dates
      expect(metadata.corruptionNotes.some(n => n.includes('created_at'))).toBe(true);
    });
  });

  describe('non-existent file', () => {
    it('should return error for non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.db');

      const result = SQLiteSalvage.salvage(nonExistentPath);

      expect(isErr(result)).toBe(true);
      if (!isErr(result)) return;

      expect(result.error.code).toBe('CORRUPTED_STATE');
      expect(result.error.message).toContain('Failed to open database');
    });
  });

  describe('permission errors', () => {
    it('should handle unreadable file gracefully', () => {
      // Skip on Windows as permission model differs
      if (process.platform === 'win32') {
        return;
      }

      const dbPath = createValidDatabase();

      // Remove read permissions
      fs.chmodSync(dbPath, 0o000);

      const result = SQLiteSalvage.salvage(dbPath);

      // Restore permissions for cleanup
      try {
        fs.chmodSync(dbPath, 0o644);
      } catch {
        // Ignore
      }

      expect(isErr(result)).toBe(true);
      if (!isErr(result)) return;

      expect(result.error.code).toBe('CORRUPTED_STATE');
    });
  });

  describe('integrity check handling', () => {
    it('should report corruption detected by integrity_check', () => {
      const dbPath = createValidDatabase();

      // Open and corrupt the database by writing garbage to a page
      const db = new Database(dbPath);
      try {
        // Force a write to ensure WAL is applied
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch {
        // Ignore
      }
      db.close();

      // Read and corrupt some bytes in the middle (avoid header)
      const data = fs.readFileSync(dbPath);
      if (data.length > 2048) {
        // Corrupt a page in the middle
        for (let i = 1024; i < 1100; i++) {
          data[i] = 0xff;
        }
        fs.writeFileSync(dbPath, data);
      }

      const result = SQLiteSalvage.salvage(dbPath);

      // May succeed with partial data or fail depending on corruption extent
      if (isOk(result)) {
        expect(result.data.metadata.integrityCheckResult).toBeDefined();
        // If corruption was detected, should have notes
        if (result.data.metadata.integrityCheckResult !== 'ok') {
          expect(result.data.metadata.corruptionNotes.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('snapshot metadata', () => {
    it('should include version in snapshot', () => {
      const dbPath = createValidDatabase();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      expect(result.data.snapshot!.version).toBe(1);
    });

    it('should track which tables were salvaged', () => {
      const dbPath = createValidDatabase();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const salvaged = result.data.metadata.tablesSalvaged;
      expect(salvaged).toContain('project');
      expect(salvaged).toContain('milestone');
      expect(salvaged).toContain('slice');
      expect(salvaged).toContain('task');
      expect(salvaged).toContain('dependency');
      expect(salvaged).toContain('workflow_session');
      expect(salvaged).toContain('review');
    });
  });

  describe('malformed rows', () => {
    it('should continue salvaging even if some rows fail', () => {
      const dbPath = path.join(tempDir, 'malformed.db');
      const db = new Database(dbPath);

      // Create schema without NOT NULL constraints to simulate corrupted data
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
      db.prepare("INSERT INTO project VALUES ('singleton', 'Test', NULL, ?)").run(now);
      db.prepare("INSERT INTO milestone VALUES ('M01', 'singleton', 1, 'M1', 'open', NULL, ?)").run(now);
      db.prepare("INSERT INTO slice VALUES ('M01-S01', 'M01', 1, 'S1', 'discussing', NULL, ?)").run(now);
      db.prepare("INSERT INTO task VALUES ('M01-S01-T01', 'M01-S01', 1, 'Valid Task', NULL, 'open', NULL, NULL, NULL, NULL, ?)").run(now);
      db.prepare("INSERT INTO task VALUES ('M01-S01-T02', 'M01-S01', 2, 'Another Valid Task', NULL, 'open', NULL, NULL, NULL, NULL, ?)").run(now);
      // Add a task with NULL title (should be skipped during salvage)
      db.prepare("INSERT INTO task VALUES ('M01-S01-T03', 'M01-S01', 3, NULL, NULL, 'open', NULL, NULL, NULL, NULL, ?)").run(now);

      db.close();

      const result = SQLiteSalvage.salvage(dbPath);

      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      // Should have 2 valid tasks (the NULL one is skipped)
      expect(result.data.snapshot!.tasks).toHaveLength(2);

      // Should have corruption note about the skipped row
      expect(result.data.metadata.corruptionNotes.some(n => n.includes('M01-S01-T03'))).toBe(true);
    });
  });
});
