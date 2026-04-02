import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../result.js';
import type { DatabaseInit } from './database-init.port.js';
import type { DependencyStore } from './dependency-store.port.js';
import type { MilestoneStore } from './milestone-store.port.js';
import type { ProjectStore } from './project-store.port.js';
import type { SliceStore } from './slice-store.port.js';
import type { TaskStore } from './task-store.port.js';

type DependencyTestAdapter = DependencyStore & DatabaseInit & ProjectStore & MilestoneStore & SliceStore & TaskStore;

export const runDependencyStoreContractTests = (name: string, createAdapter: () => DependencyTestAdapter) => {
  describe(`DependencyStore contract [${name}]`, () => {
    let store: DependencyTestAdapter;

    beforeEach(() => {
      store = createAdapter();
      store.init();
      // Seed parent chain
      store.saveProject({ name: 'Test' });
      store.createMilestone({ number: 1, name: 'M1' });
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'S1' });
      store.createTask({ sliceId: 'M01-S01', number: 1, title: 'T1' });
      store.createTask({ sliceId: 'M01-S01', number: 2, title: 'T2' });
      store.createTask({ sliceId: 'M01-S01', number: 3, title: 'T3' });
    });

    it('addDependency creates edge', () => {
      const result = store.addDependency('M01-S01-T01', 'M01-S01-T02', 'blocks');
      expect(isOk(result)).toBe(true);
    });

    it('getDependencies returns outbound and inbound edges', () => {
      store.addDependency('M01-S01-T01', 'M01-S01-T02', 'blocks');

      // T01 is blocked by T02 (T01 has outbound dep to T02)
      const t1Deps = store.getDependencies('M01-S01-T01');
      expect(isOk(t1Deps)).toBe(true);
      if (isOk(t1Deps)) {
        expect(t1Deps.data.length).toBeGreaterThanOrEqual(1);
        expect(t1Deps.data.some((d) => d.fromId === 'M01-S01-T01' && d.toId === 'M01-S01-T02')).toBe(true);
      }

      // T02 should also show the edge (as it blocks T01)
      const t2Deps = store.getDependencies('M01-S01-T02');
      expect(isOk(t2Deps)).toBe(true);
      if (isOk(t2Deps)) {
        expect(t2Deps.data.some((d) => d.fromId === 'M01-S01-T01' && d.toId === 'M01-S01-T02')).toBe(true);
      }
    });

    it('removeDependency deletes edge', () => {
      store.addDependency('M01-S01-T01', 'M01-S01-T02', 'blocks');
      store.removeDependency('M01-S01-T01', 'M01-S01-T02');

      const result = store.getDependencies('M01-S01-T01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('getDependencies returns empty for task with no deps', () => {
      const result = store.getDependencies('M01-S01-T03');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toHaveLength(0);
    });

    it('duplicate addDependency is idempotent or returns clear error', () => {
      store.addDependency('M01-S01-T01', 'M01-S01-T02', 'blocks');
      const result = store.addDependency('M01-S01-T01', 'M01-S01-T02', 'blocks');
      // Either succeeds (idempotent) or returns an error (not a crash)
      expect(typeof result.ok).toBe('boolean');
    });
  });
};

// Invoke with both adapters
import { SQLiteStateAdapter } from '../../infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';

runDependencyStoreContractTests('SQLiteStateAdapter', () => {
  const adapter = SQLiteStateAdapter.createInMemory();
  adapter.init();
  return adapter;
});

runDependencyStoreContractTests('InMemoryStateAdapter', () => {
  const adapter = new InMemoryStateAdapter();
  adapter.init();
  return adapter;
});
