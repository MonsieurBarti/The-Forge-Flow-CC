import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../result.js';
import type { DatabaseInit } from './database-init.port.js';
import type { MilestoneStore } from './milestone-store.port.js';
import type { ProjectStore } from './project-store.port.js';
import type { SliceStore } from './slice-store.port.js';

export const runMilestoneStoreContractTests = (
  name: string,
  createAdapter: () => MilestoneStore & ProjectStore & SliceStore & DatabaseInit,
) => {
  describe(`MilestoneStore contract [${name}]`, () => {
    let store: MilestoneStore & ProjectStore & SliceStore & DatabaseInit;
    beforeEach(() => {
      store = createAdapter();
      store.init();
      store.saveProject({ name: 'Test Project' });
    });

    it('createMilestone returns milestone with generated id', () => {
      const result = store.createMilestone({ number: 1, name: 'MVP' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.id).toBe('M01');
        expect(result.data.name).toBe('MVP');
        expect(result.data.number).toBe(1);
        expect(result.data.status).toBe('open');
      }
    });

    it('getMilestone returns null for unknown id', () => {
      const result = store.getMilestone('nonexistent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toBeNull();
    });

    it('getMilestone returns saved milestone', () => {
      store.createMilestone({ number: 1, name: 'MVP' });
      const result = store.getMilestone('M01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).not.toBeNull();
        expect(result.data!.name).toBe('MVP');
      }
    });

    it('listMilestones returns all', () => {
      store.createMilestone({ number: 1, name: 'M1' });
      store.createMilestone({ number: 2, name: 'M2' });
      const result = store.listMilestones();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toHaveLength(2);
    });

    it('updateMilestone updates name', () => {
      store.createMilestone({ number: 1, name: 'Old' });
      store.updateMilestone('M01', { name: 'New' });
      const result = store.getMilestone('M01');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data!.name).toBe('New');
    });

    it('closeMilestone sets status and reason', () => {
      store.createMilestone({ number: 1, name: 'Test' });
      const closeResult = store.closeMilestone('M01', 'Completed');
      expect(isOk(closeResult)).toBe(true);
      const result = store.getMilestone('M01');
      if (isOk(result)) {
        expect(result.data!.status).toBe('closed');
        expect(result.data!.closeReason).toBe('Completed');
      }
    });

    it('closeMilestone with no open slices succeeds', () => {
      store.createMilestone({ number: 1, name: 'Test' });
      const result = store.closeMilestone('M01');
      expect(isOk(result)).toBe(true);
    });

    it('closeMilestone with open slices returns HAS_OPEN_CHILDREN', () => {
      store.createMilestone({ number: 1, name: 'Test' });
      store.createSlice({ milestoneId: 'M01', number: 1, title: 'Open Slice' });
      const result = store.closeMilestone('M01');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('HAS_OPEN_CHILDREN');
      }
    });
  });
};

import { SQLiteStateAdapter } from '../../infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';

runMilestoneStoreContractTests('SQLiteStateAdapter', () => SQLiteStateAdapter.createInMemory());
runMilestoneStoreContractTests('InMemoryStateAdapter', () => new InMemoryStateAdapter());
