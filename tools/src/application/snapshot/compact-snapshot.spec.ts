import { describe, it, expect } from 'vitest';
import { compactSnapshot } from './compact-snapshot';

describe('compactSnapshot', () => {
  it('should deduplicate entries keeping latest per id', () => {
    const input = [
      '{"id":"a","label":"tff:slice","title":"S01","status":"discussing","design":"","deps":{"blocks":[],"validates":[]},"kvs":{},"snapshot_ts":"2026-03-01T00:00:00Z"}',
      '{"id":"a","label":"tff:slice","title":"S01","status":"executing","design":"# Plan","deps":{"blocks":[],"validates":[]},"kvs":{},"snapshot_ts":"2026-03-02T00:00:00Z"}',
      '{"id":"b","label":"tff:task","title":"T01","status":"open","design":"","deps":{"blocks":[],"validates":[]},"kvs":{},"snapshot_ts":"2026-03-01T00:00:00Z"}',
    ].join('\n');
    const result = compactSnapshot(input);
    const lines = result.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    const aEntry = JSON.parse(lines.find(l => l.includes('"a"'))!);
    expect(aEntry.status).toBe('executing');
  });

  it('should sort output by id for deterministic diffs', () => {
    const input = [
      '{"id":"z","label":"tff:slice","title":"SZ","status":"open","design":"","deps":{"blocks":[],"validates":[]},"kvs":{},"snapshot_ts":"2026-03-01T00:00:00Z"}',
      '{"id":"a","label":"tff:slice","title":"SA","status":"open","design":"","deps":{"blocks":[],"validates":[]},"kvs":{},"snapshot_ts":"2026-03-01T00:00:00Z"}',
    ].join('\n');
    const result = compactSnapshot(input);
    const lines = result.split('\n').filter(Boolean);
    expect(JSON.parse(lines[0]).id).toBe('a');
    expect(JSON.parse(lines[1]).id).toBe('z');
  });

  it('should handle empty input', () => {
    expect(compactSnapshot('')).toBe('');
  });
});
