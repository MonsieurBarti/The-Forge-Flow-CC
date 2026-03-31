import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCurrentVersion, runMigrations } from './schema.js';

describe('schema', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
  });
  afterEach(() => {
    db.close();
  });

  it('runs v1 migration on fresh db', () => {
    runMigrations(db);
    expect(getCurrentVersion(db)).toBe(1);
  });

  it('is idempotent', () => {
    runMigrations(db);
    runMigrations(db);
    expect(getCurrentVersion(db)).toBe(1);
  });

  it('enables WAL mode', () => {
    // WAL mode requires a file-based DB (SQLite does not support WAL on :memory:)
    const dir = mkdtempSync(join(tmpdir(), 'tff-schema-test-'));
    const fileDb = new Database(join(dir, 'test.db'));
    try {
      runMigrations(fileDb);
      const mode = fileDb.pragma('journal_mode', { simple: true });
      expect(mode).toBe('wal');
    } finally {
      fileDb.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('enables foreign keys', () => {
    runMigrations(db);
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('enforces project singleton constraint', () => {
    runMigrations(db);
    db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P1')").run();
    expect(() => {
      db.prepare("INSERT INTO project (id, name) VALUES ('other', 'P2')").run();
    }).toThrow();
  });

  it('rejects VERSION_MISMATCH when db version > code version', () => {
    runMigrations(db);
    db.prepare('UPDATE schema_version SET version = 999').run();
    const db2 = new Database(':memory:');
    // Run migrations on the same db — version check should fail
    expect(() => runMigrations(db)).toThrow(/VERSION_MISMATCH|upgrade tff-tools/i);
    db2.close();
  });

  it('creates all expected tables', () => {
    runMigrations(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
      name: string;
    }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('project');
    expect(tableNames).toContain('milestone');
    expect(tableNames).toContain('slice');
    expect(tableNames).toContain('task');
    expect(tableNames).toContain('dependency');
    expect(tableNames).toContain('workflow_session');
    expect(tableNames).toContain('schema_version');
  });

  it('cascades dependency deletion when task deleted', () => {
    runMigrations(db);
    db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
    db.prepare("INSERT INTO milestone (id, project_id, number, name) VALUES ('M01', 'singleton', 1, 'M')").run();
    db.prepare("INSERT INTO slice (id, milestone_id, number, title) VALUES ('M01-S01', 'M01', 1, 'S')").run();
    db.prepare("INSERT INTO task (id, slice_id, number, title) VALUES ('t1', 'M01-S01', 1, 'T1')").run();
    db.prepare("INSERT INTO task (id, slice_id, number, title) VALUES ('t2', 'M01-S01', 2, 'T2')").run();
    db.prepare("INSERT INTO dependency (from_id, to_id, type) VALUES ('t1', 't2', 'blocks')").run();

    db.prepare("DELETE FROM task WHERE id = 't1'").run();
    const deps = db.prepare('SELECT * FROM dependency').all();
    expect(deps).toHaveLength(0);
  });

  it('prevents deleting milestone with slices (FK constraint)', () => {
    runMigrations(db);
    db.prepare("INSERT INTO project (id, name) VALUES ('singleton', 'P')").run();
    db.prepare("INSERT INTO milestone (id, project_id, number, name) VALUES ('M01', 'singleton', 1, 'M')").run();
    db.prepare("INSERT INTO slice (id, milestone_id, number, title) VALUES ('M01-S01', 'M01', 1, 'S')").run();

    expect(() => {
      db.prepare("DELETE FROM milestone WHERE id = 'M01'").run();
    }).toThrow();
  });
});
