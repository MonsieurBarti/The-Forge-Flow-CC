import { describe, it, expect } from 'vitest';
import { PatternSchema } from './pattern.js';

describe('Pattern', () => {
  it('should accept a valid pattern', () => {
    const p = PatternSchema.parse({
      sequence: ['Read', 'Grep', 'Edit'],
      count: 12,
      sessions: 8,
      projects: 3,
      lastSeen: '2026-03-21',
    });
    expect(p.sequence).toHaveLength(3);
    expect(p.count).toBe(12);
  });

  it('should reject empty sequence', () => {
    expect(() => PatternSchema.parse({
      sequence: [],
      count: 1,
      sessions: 1,
      projects: 1,
      lastSeen: '2026-03-21',
    })).toThrow();
  });

  it('should reject zero count', () => {
    expect(() => PatternSchema.parse({
      sequence: ['Read'],
      count: 0,
      sessions: 1,
      projects: 1,
      lastSeen: '2026-03-21',
    })).toThrow();
  });
});
