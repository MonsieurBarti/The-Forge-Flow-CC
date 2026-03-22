import { describe, expect, it } from 'vitest';
import { type BeadLabel, BeadLabelSchema } from './bead-label.js';

describe('BeadLabel', () => {
  it('should accept all valid labels', () => {
    const labels: BeadLabel[] = ['tff:project', 'tff:milestone', 'tff:slice', 'tff:req', 'tff:task', 'tff:research'];
    for (const l of labels) {
      expect(BeadLabelSchema.parse(l)).toBe(l);
    }
  });

  it('should reject invalid labels', () => {
    expect(() => BeadLabelSchema.parse('tff:unknown')).toThrow();
    expect(() => BeadLabelSchema.parse('forge:task')).toThrow();
  });
});
