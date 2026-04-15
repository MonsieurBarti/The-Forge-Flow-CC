import { describe, expect, it } from 'vitest';
import type { Pattern } from '../../src/../src/domain/value-objects/pattern.js';
import { aggregatePatterns } from '../../../src/application/patterns/aggregate-patterns.js';

describe('aggregatePatterns', () => {
  it('should filter patterns below minimum count', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 2, sessions: 2, projects: 1, lastSeen: '2026-03-21' },
      { sequence: ['Grep', 'Edit'], count: 5, sessions: 4, projects: 2, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toEqual(['Grep', 'Edit']);
  });

  it('should filter framework noise (patterns in 80%+ sessions)', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Read'], count: 50, sessions: 45, projects: 5, lastSeen: '2026-03-21' },
      { sequence: ['Read', 'Edit'], count: 10, sessions: 8, projects: 3, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3, totalSessions: 50, noiseThreshold: 0.8 });
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toEqual(['Read', 'Edit']);
  });

  it('should filter patterns below configurable minCount', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 2, sessions: 2, projects: 1, lastSeen: new Date().toISOString() },
      { sequence: ['Read', 'Write'], count: 5, sessions: 3, projects: 2, lastSeen: new Date().toISOString() },
    ];
    const result = aggregatePatterns(patterns, { minCount: 4 });
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toEqual(['Read', 'Write']);
  });

  it('should pass through patterns meeting all criteria', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Grep', 'Edit'], count: 12, sessions: 8, projects: 3, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3, totalSessions: 20, noiseThreshold: 0.8 });
    expect(result).toHaveLength(1);
  });
});
