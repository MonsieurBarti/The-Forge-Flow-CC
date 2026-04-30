export const v9Migration = `
ALTER TABLE slice ADD COLUMN archived_at TEXT;
ALTER TABLE milestone ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_slice_archived ON slice(archived_at);
CREATE INDEX IF NOT EXISTS idx_milestone_archived ON milestone(archived_at);
`;
