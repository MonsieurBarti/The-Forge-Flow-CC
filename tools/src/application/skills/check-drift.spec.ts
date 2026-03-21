import { describe, it, expect } from 'vitest';
import { checkDrift } from './check-drift.js';

describe('checkDrift', () => {
  it('should return 0 drift when content is identical', () => {
    const result = checkDrift('original content', 'original content');
    expect(result.driftScore).toBe(0);
    expect(result.overThreshold).toBe(false);
  });

  it('should detect drift when content changes', () => {
    const original = 'a'.repeat(100);
    const current = 'b'.repeat(30) + 'a'.repeat(70);
    const result = checkDrift(original, current);
    expect(result.driftScore).toBeGreaterThan(0);
  });

  it('should flag when drift exceeds threshold', () => {
    const original = 'a'.repeat(100);
    const current = 'b'.repeat(70) + 'a'.repeat(30);
    const result = checkDrift(original, current, { maxDrift: 0.6 });
    expect(result.overThreshold).toBe(true);
  });
});
