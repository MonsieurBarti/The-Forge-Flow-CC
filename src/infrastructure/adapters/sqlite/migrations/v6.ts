export const v6Migration = `
CREATE TABLE IF NOT EXISTS pending_judgments (
  slice_id TEXT PRIMARY KEY REFERENCES slice(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_judgments_created ON pending_judgments(created_at);
`;
