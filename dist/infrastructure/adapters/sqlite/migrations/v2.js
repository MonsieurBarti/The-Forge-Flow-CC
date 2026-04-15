export const v2Migration = `
CREATE TABLE IF NOT EXISTS review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slice(id),
  type TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  verdict TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_slice ON review(slice_id, type);

ALTER TABLE task ADD COLUMN claimed_by TEXT;
`;
export const SCHEMA_VERSION_2 = 2;
//# sourceMappingURL=v2.js.map