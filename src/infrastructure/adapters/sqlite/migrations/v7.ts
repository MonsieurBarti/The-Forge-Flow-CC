export const v7Migration = `
ALTER TABLE pending_judgments ADD COLUMN merge_sha TEXT;
ALTER TABLE pending_judgments ADD COLUMN base_ref TEXT;
`;
