import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';
import { transitionSliceUseCase } from './transition-slice.js';

describe('transitionSliceUseCase', () => {
  let adapter: InMemoryStateAdapter;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    adapter.saveProject({ name: 'Test', vision: 'v' });
    adapter.createMilestone({ number: 1, name: 'MVP' });
    adapter.createSlice({ milestoneId: 'M01', number: 1, title: 'Auth' });
  });

  it('should transition slice and update store status', async () => {
    const result = await transitionSliceUseCase(
      { sliceId: 'M01-S01', targetStatus: 'researching' },
      { sliceStore: adapter },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.slice.status).toBe('researching');
      expect(result.data.events).toHaveLength(1);
    }
  });

  it('should reject invalid transition', async () => {
    const result = await transitionSliceUseCase(
      { sliceId: 'M01-S01', targetStatus: 'executing' },
      { sliceStore: adapter },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('transitionSlice with EventBus', () => {
  it('publishes SLICE_STATUS_CHANGED event via EventBus (AC13)', async () => {
    const adapter = new InMemoryStateAdapter();
    adapter.saveProject({ name: 'Test', vision: 'v' });
    adapter.createMilestone({ number: 1, name: 'M01' });
    adapter.createSlice({ milestoneId: 'M01', number: 1, title: 'Test' });

    const publishFn = vi.fn();
    const eventBus = { publish: publishFn, subscribe: () => {} };

    const result = await transitionSliceUseCase(
      { sliceId: 'M01-S01', targetStatus: 'researching' },
      { sliceStore: adapter, eventBus },
    );
    expect(isOk(result)).toBe(true);
    expect(publishFn).toHaveBeenCalledOnce();
    expect(publishFn.mock.calls[0][0].type).toBe('SLICE_STATUS_CHANGED');
  });
});
