import { describe, expect, it } from 'vitest';
import { BeadSnapshotSchema, createSnapshot, latestById } from './bead-snapshot';

describe('bead-snapshot', () => {
  it('should validate a well-formed snapshot entry', () => {
    const result = BeadSnapshotSchema.safeParse({
      id: 'abc123',
      label: 'tff:slice',
      title: 'M01-S01',
      status: 'executing',
      design: '# Plan',
      deps: { blocks: ['def456'], validates: [] },
      kvs: { executor: 'backend-dev' },
      snapshot_ts: '2026-03-21T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject entry missing id', () => {
    const result = BeadSnapshotSchema.safeParse({ label: 'tff:slice' });
    expect(result.success).toBe(false);
  });

  it('should create snapshot from BeadData', () => {
    const snap = createSnapshot({
      id: 'abc',
      label: 'tff:slice',
      title: 'S01',
      status: 'open',
      design: '# Plan',
      blocks: ['x'],
      validates: [],
      metadata: { k: 'v' },
    });
    expect(snap.id).toBe('abc');
    expect(snap.deps.blocks).toEqual(['x']);
    expect(snap.kvs).toEqual({ k: 'v' });
    expect(snap.snapshot_ts).toBeDefined();
  });

  it('should resolve latest entry per id', () => {
    const entries = [
      {
        id: 'a',
        label: 'tff:slice' as const,
        title: 'S01',
        status: 'discussing',
        design: '',
        deps: { blocks: [] as string[], validates: [] as string[] },
        kvs: {},
        snapshot_ts: '2026-03-01T00:00:00Z',
      },
      {
        id: 'a',
        label: 'tff:slice' as const,
        title: 'S01',
        status: 'executing',
        design: '# Plan',
        deps: { blocks: [] as string[], validates: [] as string[] },
        kvs: {},
        snapshot_ts: '2026-03-02T00:00:00Z',
      },
      {
        id: 'b',
        label: 'tff:task' as const,
        title: 'T01',
        status: 'open',
        design: '',
        deps: { blocks: [] as string[], validates: [] as string[] },
        kvs: {},
        snapshot_ts: '2026-03-01T00:00:00Z',
      },
    ];
    const latest = latestById(entries);
    expect(latest).toHaveLength(2);
    expect(latest.find((e) => e.id === 'a')?.status).toBe('executing');
  });
});
