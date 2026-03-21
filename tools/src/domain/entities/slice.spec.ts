import { describe, it, expect } from 'vitest';
import { createSlice, transitionSlice, formatSliceId, SliceSchema } from './slice.js';
import { isOk, isErr } from '../result.js';

describe('Slice', () => {
  const makeSlice = () =>
    createSlice({
      milestoneId: crypto.randomUUID(),
      name: 'Auth flow',
      milestoneNumber: 1,
      sliceNumber: 1,
    });

  it('should create a slice in discussing status', () => {
    const slice = makeSlice();
    expect(slice.status).toBe('discussing');
    expect(slice.name).toBe('Auth flow');
  });

  it('should format slice ID as M01-S01', () => {
    expect(formatSliceId(1, 1)).toBe('M01-S01');
    expect(formatSliceId(2, 12)).toBe('M02-S12');
  });

  it('should validate against schema', () => {
    expect(() => SliceSchema.parse(makeSlice())).not.toThrow();
  });

  describe('transitionSlice', () => {
    it('should allow valid transition discussing → researching', () => {
      const slice = makeSlice();
      const result = transitionSlice(slice, 'researching');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.slice.status).toBe('researching');
        expect(result.data.events).toHaveLength(1);
        expect(result.data.events[0].type).toBe('SLICE_STATUS_CHANGED');
      }
    });

    it('should reject invalid transition discussing → executing', () => {
      const slice = makeSlice();
      const result = transitionSlice(slice, 'executing');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject transition from closed', () => {
      const slice = { ...makeSlice(), status: 'closed' as const };
      const result = transitionSlice(slice, 'discussing');
      expect(isErr(result)).toBe(true);
    });
  });
});
