export const v3Migration = `
-- Add branch column to milestone table for UUID-based branch naming
-- Existing milestones get empty string as default (they keep label-based branches)
ALTER TABLE milestone ADD COLUMN branch TEXT NOT NULL DEFAULT '';
`;

export const SCHEMA_VERSION_3 = 3;
