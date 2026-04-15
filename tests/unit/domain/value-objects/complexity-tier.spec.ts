import { describe, expect, it } from 'vitest';
import { ComplexityTierSchema, tierConfig } from '../../../src/domain/complexity-tier.js';

describe('ComplexityTier', () => {
  it('should accept valid tiers', () => {
    expect(ComplexityTierSchema.parse('S')).toBe('S');
    expect(ComplexityTierSchema.parse('F-lite')).toBe('F-lite');
    expect(ComplexityTierSchema.parse('F-full')).toBe('F-full');
  });

  it('should reject invalid tiers', () => {
    expect(() => ComplexityTierSchema.parse('XXL')).toThrow();
  });

  it('should have correct config for S tier', () => {
    const config = tierConfig('S');
    expect(config.brainstormer).toBe(false);
    expect(config.research).toBe('skip');
    expect(config.tdd).toBe(false);
  });

  it('should have correct config for F-lite tier', () => {
    const config = tierConfig('F-lite');
    expect(config.brainstormer).toBe(true);
    expect(config.research).toBe('optional');
    expect(config.tdd).toBe(true);
  });

  it('should have correct config for F-full tier', () => {
    const config = tierConfig('F-full');
    expect(config.brainstormer).toBe(true);
    expect(config.research).toBe('required');
    expect(config.tdd).toBe(true);
  });
});
