import { describe, it, expect, beforeEach } from 'vitest';
import { transitionSliceUseCase } from './transition-slice.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { isOk, isErr } from '../../domain/result.js';
import { createSlice } from '../../domain/entities/slice.js';

describe('transitionSliceUseCase', () => {
  let beadStore: InMemoryBeadStore;

  beforeEach(() => { beadStore = new InMemoryBeadStore(); });

  it('should transition slice and update bead status', async () => {
    const slice = createSlice({ milestoneId: crypto.randomUUID(), name: 'Auth', milestoneNumber: 1, sliceNumber: 1 });
    beadStore.seed([{ id: 'bead-1', label: 'tff:slice', title: 'Auth', status: 'discussing' }]);
    const result = await transitionSliceUseCase({ slice, beadId: 'bead-1', targetStatus: 'researching' }, { beadStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) { expect(result.data.slice.status).toBe('researching'); expect(result.data.events).toHaveLength(1); }
  });

  it('should reject invalid transition', async () => {
    const slice = createSlice({ milestoneId: crypto.randomUUID(), name: 'Auth', milestoneNumber: 1, sliceNumber: 1 });
    const result = await transitionSliceUseCase({ slice, beadId: 'bead-1', targetStatus: 'executing' }, { beadStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('INVALID_TRANSITION');
  });
});
