import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../result.js';
import type { DatabaseInit } from '../../../src/infrastructure/testing/database-init.port.js';
import type { MilestoneStore } from '../../../src/infrastructure/testing/milestone-store.port.js';
import type { ProjectStore } from '../../../src/infrastructure/testing/project-store.port.js';
import type { SliceStore } from '../../../src/infrastructure/testing/slice-store.port.js';

export const runSliceStoreContractTests = (
  name: string,
  createAdapter: () => SliceStore & MilestoneStore & ProjectStore & DatabaseInit,
) => {
  describe(`SliceStore contract [${name}]`, () => {
    let store: SliceStore & MilestoneStore & ProjectStore & DatabaseInit;

    beforeEach(() => {
      store = createAdapter();
      store.init();
      store.saveProject({ name: 'Test Project' });
      store.createMilestone({ number: 1, name: 'M1' });
    });

    it('createSlice returns slice with human-readable id (e.g. M01-S01)', () => {
      const result = store.createSlice({ milestoneId: 'M01', number: 1, title: 'First Slice' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.id).toBe('M01-S01');
        expect(result.data.title).toBe('First Slice');
        expect(result.data.milestoneId).toBe('M01');
        expect(result.data.number).toBe(1);
        expect(result.data.status).toBe('discussing');
      }
    });

    it('getSlice returns null for unknown id', () => {
      const result = store.getSlice('nonexistent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toBeNull();
    });

    it('getSlice returns saved slice', () => {
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'First Slice' });
      const result = store.getSlice('M01-S01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).not.toBeNull();
        expect(result.data!.title).toBe('First Slice');
        expect(result.data!.id).toBe('M01-S01');
      }
    });

    it('listSlices returns all slices when no milestoneId given', () => {
      store.createMilestone({ number: 2, name: 'M2' });
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Slice A' });
      store.createSlice({ milestoneId: 'M02', number: 1, title: 'Slice B' });
      const result = store.listSlices();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toHaveLength(2);
    });

    it('listSlices filtered by milestoneId', () => {
      store.createMilestone({ number: 2, name: 'M2' });
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Slice A' });
      store.createSlice({ milestoneId: 'M02', number: 1, title: 'Slice B' });
      const result = store.listSlices('M01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].milestoneId).toBe('M01');
      }
    });

    it('updateSlice updates title', () => {
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Old Title' });
      store.updateSlice('M01-S01', { title: 'New Title' });
      const result = store.getSlice('M01-S01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data!.title).toBe('New Title');
    });

    it('transitionSlice delegates to domain function, returns events', () => {
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Slice' });
      const result = store.transitionSlice('M01-S01', 'researching');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].type).toBe('SLICE_STATUS_CHANGED');
      }
      const updated = store.getSlice('M01-S01');
      if (isOk(updated)) expect(updated.data!.status).toBe('researching');
    });

    it('transitionSlice invalid transition returns INVALID_TRANSITION error', () => {
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Slice' });
      // 'discussing' -> 'closed' is not a valid transition
      const result = store.transitionSlice('M01-S01', 'closed');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_TRANSITION');
      }
    });
  });
};

import { SQLiteStateAdapter } from '../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { InMemoryStateAdapter } from '../../src/infrastructure/testing/in-memory-state-adapter.js';

runSliceStoreContractTests('SQLiteStateAdapter', () => {
  const adapter = SQLiteStateAdapter.createInMemory();
  adapter.init();
  return adapter;
});

runSliceStoreContractTests('InMemoryStateAdapter', () => {
  const adapter = new InMemoryStateAdapter();
  adapter.init();
  return adapter;
});
