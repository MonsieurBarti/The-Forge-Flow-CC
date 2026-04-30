export const v8Migration = `
-- Decouple slice from milestone: make milestone_id nullable, add kind/base_branch/branch_name.
-- SQLite cannot ALTER COLUMN ... DROP NOT NULL, so we recreate the table.
-- Foreign keys from task, slice_dependency, pending_judgments, workflow_session
-- are tracked by name; the DROP+RENAME below preserves them.
CREATE TABLE slice_new (
  id TEXT PRIMARY KEY,
  milestone_id TEXT REFERENCES milestone(id),
  kind TEXT NOT NULL DEFAULT 'milestone' CHECK (kind IN ('milestone','quick','debug')),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discussing',
  tier TEXT,
  base_branch TEXT,
  branch_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO slice_new (id, milestone_id, kind, number, title, status, tier, base_branch, branch_name, created_at, updated_at)
SELECT id, milestone_id, 'milestone', number, title, status, tier, NULL, NULL, created_at, updated_at
FROM slice;

DROP TABLE slice;
ALTER TABLE slice_new RENAME TO slice;

CREATE INDEX IF NOT EXISTS idx_slice_milestone ON slice(milestone_id);
CREATE INDEX IF NOT EXISTS idx_slice_status ON slice(status);
CREATE INDEX IF NOT EXISTS idx_slice_kind ON slice(kind);
CREATE INDEX IF NOT EXISTS idx_slice_kind_status ON slice(kind, status);
`;
