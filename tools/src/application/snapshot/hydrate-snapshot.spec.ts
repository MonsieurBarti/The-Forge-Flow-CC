import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import type { BeadSnapshot } from '../../domain/value-objects/bead-snapshot.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { hydrateSnapshot } from './hydrate-snapshot.js';

function jsonl(...entries: BeadSnapshot[]): string {
  return entries.map((e) => JSON.stringify(e)).join('\n');
}

describe('hydrateSnapshot', () => {
  let beadStore: InMemoryBeadStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
  });

  it('should hydrate 2 beads from JSONL', async () => {
    const content = jsonl(
      {
        id: 'snap-1',
        label: 'tff:milestone',
        title: 'MVP',
        status: 'open',
        design: '',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'snap-2',
        label: 'tff:slice',
        title: 'Auth',
        status: 'executing',
        design: 'Auth design doc',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      },
    );

    const result = await hydrateSnapshot({ beadStore, snapshotContent: content });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toBe(2);
      expect(result.data.skipped).toBe(0);
    }

    const listed = await beadStore.list({});
    expect(isOk(listed)).toBe(true);
    if (isOk(listed)) {
      expect(listed.data).toHaveLength(2);
      const auth = listed.data.find((b) => b.title === 'Auth');
      expect(auth?.status).toBe('executing');
      expect(auth?.design).toBe('Auth design doc');
    }
  });

  it('should resolve delta format -- only latest entry hydrated', async () => {
    const content = jsonl(
      {
        id: 'snap-1',
        label: 'tff:slice',
        title: 'Auth v1',
        status: 'open',
        design: '',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'snap-1',
        label: 'tff:slice',
        title: 'Auth v2',
        status: 'executing',
        design: 'Updated design',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-02T00:00:00.000Z',
      },
    );

    const result = await hydrateSnapshot({ beadStore, snapshotContent: content });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toBe(1);
    }

    const listed = await beadStore.list({});
    expect(isOk(listed)).toBe(true);
    if (isOk(listed)) {
      expect(listed.data).toHaveLength(1);
      expect(listed.data[0].title).toBe('Auth v2');
      expect(listed.data[0].status).toBe('executing');
      expect(listed.data[0].design).toBe('Updated design');
    }
  });

  it('should return { created: 0, skipped: 0 } for empty content', async () => {
    const result = await hydrateSnapshot({ beadStore, snapshotContent: '' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toBe(0);
      expect(result.data.skipped).toBe(0);
    }
  });
});
