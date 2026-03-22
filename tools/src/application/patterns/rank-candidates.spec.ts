import { describe, expect, it } from 'vitest';
import type { Pattern } from '../../domain/value-objects/pattern.js';
import { rankCandidates } from './rank-candidates.js';

describe('rankCandidates', () => {
  const now = '2026-03-21';

  it('should score candidates between 0 and 1', () => {
    const patterns: Pattern[] = [{ sequence: ['Read', 'Edit'], count: 10, sessions: 5, projects: 3, lastSeen: now }];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(1);
  });

  it('should rank high-frequency cross-project patterns higher', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 20, sessions: 15, projects: 5, lastSeen: now },
      { sequence: ['Grep', 'Bash'], count: 3, sessions: 2, projects: 1, lastSeen: now },
    ];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should penalize old patterns via recency decay', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 10, sessions: 5, projects: 3, lastSeen: now },
      { sequence: ['Grep', 'Bash'], count: 10, sessions: 5, projects: 3, lastSeen: '2026-01-01' },
    ];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should accept custom weights from settings', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 10, sessions: 5, projects: 3, lastSeen: new Date().toISOString() },
    ];
    const customWeights = { frequency: 0.5, breadth: 0.1, recency: 0.2, consistency: 0.2 };
    const result = rankCandidates(patterns, {
      totalProjects: 5,
      totalSessions: 10,
      now: new Date().toISOString(),
      weights: customWeights,
    });
    expect(result).toHaveLength(1);
    const defaultResult = rankCandidates(patterns, {
      totalProjects: 5,
      totalSessions: 10,
      now: new Date().toISOString(),
    });
    expect(result[0].score).not.toBe(defaultResult[0].score);
  });

  it('should filter below threshold', () => {
    const patterns: Pattern[] = [{ sequence: ['Read', 'Edit'], count: 1, sessions: 1, projects: 1, lastSeen: now }];
    const result = rankCandidates(patterns, { totalProjects: 10, totalSessions: 50, now, threshold: 0.5 });
    expect(result).toHaveLength(0);
  });
});
