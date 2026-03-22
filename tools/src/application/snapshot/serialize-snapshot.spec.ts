import { beforeEach, describe, expect, it } from 'vitest';
import type { BeadData } from '../../domain/ports/bead-store.port.js';
import { isOk } from '../../domain/result.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { serializeSnapshot } from './serialize-snapshot.js';

describe('serializeSnapshot', () => {
  let store: InMemoryBeadStore;

  const makeBead = (overrides: Partial<BeadData> & { id: string }): BeadData => ({
    label: 'tff:task',
    title: 'Test bead',
    status: 'open',
    ...overrides,
  });

  beforeEach(() => {
    store = new InMemoryBeadStore();
  });

  it('returns empty string for empty store', async () => {
    const result = await serializeSnapshot({ beadStore: store });

    expect(isOk(result)).toBe(true);
    if (result.ok) expect(result.data).toBe('');
  });

  it('serializes all beads as JSONL when no existing snapshot', async () => {
    store.seed([
      makeBead({ id: 'b1', title: 'Alpha', status: 'open' }),
      makeBead({ id: 'b2', title: 'Beta', status: 'done', design: 'some design' }),
    ]);

    const result = await serializeSnapshot({ beadStore: store });

    expect(isOk(result)).toBe(true);
    if (!result.ok) return;

    const lines = result.data.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);

    const parsed0 = JSON.parse(lines[0]);
    expect(parsed0.id).toBe('b1');
    expect(parsed0.title).toBe('Alpha');
    expect(parsed0.status).toBe('open');
    expect(parsed0.snapshot_ts).toBeDefined();

    const parsed1 = JSON.parse(lines[1]);
    expect(parsed1.id).toBe('b2');
    expect(parsed1.design).toBe('some design');
  });

  it('emits only changed beads when existing snapshot provided (delta mode)', async () => {
    store.seed([
      makeBead({ id: 'b1', title: 'Alpha', status: 'open' }),
      makeBead({ id: 'b2', title: 'Beta', status: 'done' }),
      makeBead({ id: 'b3', title: 'Gamma', status: 'open', design: 'updated design' }),
    ]);

    // Existing snapshot has b1 unchanged, b2 with different status, b3 with different design
    const existingLines = [
      JSON.stringify({
        id: 'b1',
        label: 'tff:task',
        title: 'Alpha',
        status: 'open',
        design: '',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      }),
      JSON.stringify({
        id: 'b2',
        label: 'tff:task',
        title: 'Beta',
        status: 'open',
        design: '',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      }),
      JSON.stringify({
        id: 'b3',
        label: 'tff:task',
        title: 'Gamma',
        status: 'open',
        design: 'old design',
        deps: { blocks: [], validates: [] },
        kvs: {},
        snapshot_ts: '2026-01-01T00:00:00.000Z',
      }),
    ];
    const existingSnapshot = existingLines.join('\n');

    const result = await serializeSnapshot({ beadStore: store, existingSnapshot });

    expect(isOk(result)).toBe(true);
    if (!result.ok) return;

    const lines = result.data.split('\n').filter(Boolean);
    // b1 unchanged, b2 status changed, b3 design changed
    expect(lines).toHaveLength(2);

    const ids = lines.map((l) => JSON.parse(l).id);
    expect(ids).toContain('b2');
    expect(ids).toContain('b3');
    expect(ids).not.toContain('b1');
  });

  it('detects deps changes in delta mode', async () => {
    store.seed([makeBead({ id: 'b1', title: 'Alpha', status: 'open', blocks: ['b2'] })]);

    const existingSnapshot = JSON.stringify({
      id: 'b1',
      label: 'tff:task',
      title: 'Alpha',
      status: 'open',
      design: '',
      deps: { blocks: [], validates: [] },
      kvs: {},
      snapshot_ts: '2026-01-01T00:00:00.000Z',
    });

    const result = await serializeSnapshot({ beadStore: store, existingSnapshot });

    expect(isOk(result)).toBe(true);
    if (!result.ok) return;

    const lines = result.data.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).id).toBe('b1');
  });

  it('detects kvs changes in delta mode', async () => {
    store.seed([makeBead({ id: 'b1', title: 'Alpha', status: 'open', metadata: { key: 'val' } })]);

    const existingSnapshot = JSON.stringify({
      id: 'b1',
      label: 'tff:task',
      title: 'Alpha',
      status: 'open',
      design: '',
      deps: { blocks: [], validates: [] },
      kvs: {},
      snapshot_ts: '2026-01-01T00:00:00.000Z',
    });

    const result = await serializeSnapshot({ beadStore: store, existingSnapshot });

    expect(isOk(result)).toBe(true);
    if (!result.ok) return;

    const lines = result.data.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).kvs).toEqual({ key: 'val' });
  });
});
