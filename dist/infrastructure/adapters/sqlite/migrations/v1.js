export const v1Migration = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY CHECK (id = 'singleton'),
  name TEXT NOT NULL,
  vision TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestone (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  close_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS slice (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES milestone(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discussing',
  tier TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  slice_id TEXT NOT NULL REFERENCES slice(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  wave INTEGER,
  claimed_at TEXT,
  closed_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dependency (
  from_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'blocks',
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE IF NOT EXISTS workflow_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phase TEXT NOT NULL DEFAULT 'idle',
  active_slice_id TEXT REFERENCES slice(id),
  active_milestone_id TEXT REFERENCES milestone(id),
  paused_at TEXT,
  context_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_milestone_project ON milestone(project_id);
CREATE INDEX IF NOT EXISTS idx_slice_milestone ON slice(milestone_id);
CREATE INDEX IF NOT EXISTS idx_slice_status ON slice(status);
CREATE INDEX IF NOT EXISTS idx_task_slice ON task(slice_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_wave ON task(slice_id, wave);
`;
export const SCHEMA_VERSION = 1;
//# sourceMappingURL=v1.js.map