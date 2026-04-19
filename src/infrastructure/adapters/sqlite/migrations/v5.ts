export const v5Migration = `
CREATE TABLE IF NOT EXISTS milestone_audit (
  milestone_id TEXT PRIMARY KEY REFERENCES milestone(id),
  verdict TEXT NOT NULL CHECK (verdict IN ('ready', 'not_ready')),
  audited_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_milestone_audit_verdict ON milestone_audit(verdict);
`;

export const SCHEMA_VERSION_5 = 5;
