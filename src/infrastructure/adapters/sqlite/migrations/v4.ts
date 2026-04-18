export const v4Migration = `
CREATE TABLE IF NOT EXISTS slice_dependency (
  from_id TEXT NOT NULL REFERENCES slice(id) ON DELETE CASCADE,
  to_id   TEXT NOT NULL REFERENCES slice(id) ON DELETE CASCADE,
  PRIMARY KEY (from_id, to_id)
);
`;

export const SCHEMA_VERSION_4 = 4;
