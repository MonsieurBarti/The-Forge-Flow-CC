import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { checkStaleClaims } from './check-stale-claims.js';

describe('InMemoryBeadStore — claim + stale detection', () => {
  let store: InMemoryBeadStore;

  beforeEach(() => {
    store = new InMemoryBeadStore();
  });

  it('should record claimedAt timestamp on claim', async () => {
    store.seed([{ id: 't1', label: 'tff:task', title: 'Task 1', status: 'open' }]);
    const before = new Date().toISOString();
    await store.claim('t1');
    const result = await store.get('t1');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.status).toBe('in_progress');
      expect(result.data.claimedAt).toBeDefined();
      expect(result.data.claimedAt! >= before).toBe(true);
    }
  });

  it('should list stale claims exceeding TTL', async () => {
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    store.seed([
      { id: 't1', label: 'tff:task', title: 'Task 1', status: 'in_progress', claimedAt: thirtyOneMinutesAgo },
      { id: 't2', label: 'tff:task', title: 'Task 2', status: 'in_progress', claimedAt: new Date().toISOString() },
      { id: 't3', label: 'tff:task', title: 'Task 3', status: 'open' },
    ]);
    const result = await store.listStaleClaims(30);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('t1');
    }
  });

  it('should return empty array when no stale claims', async () => {
    store.seed([{ id: 't1', label: 'tff:task', title: 'Task 1', status: 'open' }]);
    const result = await store.listStaleClaims(30);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});

describe('checkStaleClaims use case', () => {
  let store: InMemoryBeadStore;
  beforeEach(() => {
    store = new InMemoryBeadStore();
  });

  it('should return stale claims with given TTL', async () => {
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    store.seed([
      { id: 't1', label: 'tff:task', title: 'Task 1', status: 'in_progress', claimedAt: thirtyOneMinutesAgo },
    ]);
    const result = await checkStaleClaims({ ttlMinutes: 30 }, { beadStore: store });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.staleClaims).toHaveLength(1);
      expect(result.data.staleClaims[0].id).toBe('t1');
    }
  });
});
