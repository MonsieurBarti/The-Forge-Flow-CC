import { describe, it, expect } from 'vitest';
import { detectClusters } from './detect-clusters.js';

describe('detectClusters', () => {
  it('should detect skills that co-activate above threshold', () => {
    const coActivations = [
      { skills: ['hexagonal-architecture', 'commit-conventions', 'tdd'], sessions: 17 },
      { skills: ['hexagonal-architecture', 'commit-conventions'], sessions: 18 },
      { skills: ['code-review-checklist'], sessions: 10 },
    ];
    const result = detectClusters(coActivations, { totalSessions: 20, threshold: 0.7 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].skills).toContain('hexagonal-architecture');
    expect(result[0].skills).toContain('commit-conventions');
  });

  it('should not cluster skills below threshold', () => {
    const coActivations = [
      { skills: ['a', 'b'], sessions: 3 },
    ];
    const result = detectClusters(coActivations, { totalSessions: 20, threshold: 0.7 });
    expect(result).toHaveLength(0);
  });
});
