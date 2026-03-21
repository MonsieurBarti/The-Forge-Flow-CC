import { describe, it, expect } from 'vitest';
import { detectWaves } from './detect-waves.js';
import { isOk, isErr } from '../../domain/result.js';

describe('detectWaves', () => {
  it('should put independent tasks in wave 0', () => {
    const result = detectWaves([{ id: 't1', dependsOn: [] }, { id: 't2', dependsOn: [] }, { id: 't3', dependsOn: [] }]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) { expect(result.data).toHaveLength(1); expect(result.data[0].index).toBe(0); expect(result.data[0].taskIds).toEqual(['t1', 't2', 't3']); }
  });

  it('should create sequential waves for linear dependencies', () => {
    const result = detectWaves([{ id: 't1', dependsOn: [] }, { id: 't2', dependsOn: ['t1'] }, { id: 't3', dependsOn: ['t2'] }]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) { expect(result.data).toHaveLength(3); expect(result.data[0].taskIds).toEqual(['t1']); expect(result.data[1].taskIds).toEqual(['t2']); expect(result.data[2].taskIds).toEqual(['t3']); }
  });

  it('should group parallel tasks with same dependencies', () => {
    const result = detectWaves([{ id: 't1', dependsOn: [] }, { id: 't2', dependsOn: ['t1'] }, { id: 't3', dependsOn: ['t1'] }, { id: 't4', dependsOn: ['t2', 't3'] }]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) { expect(result.data).toHaveLength(3); expect(result.data[0].taskIds).toEqual(['t1']); expect(result.data[1].taskIds).toContain('t2'); expect(result.data[1].taskIds).toContain('t3'); expect(result.data[2].taskIds).toEqual(['t4']); }
  });

  it('should detect circular dependencies', () => {
    const result = detectWaves([{ id: 't1', dependsOn: ['t2'] }, { id: 't2', dependsOn: ['t1'] }]);
    expect(isErr(result)).toBe(true);
  });

  it('should handle empty input', () => {
    const result = detectWaves([]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.data).toHaveLength(0);
  });
});
