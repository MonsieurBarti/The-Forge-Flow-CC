import { describe, it, expect } from 'vitest';
import { AutonomySettingsSchema, parseAutonomyMode } from './autonomy-settings';

describe('autonomy-settings', () => {
  it('should parse plan-to-pr mode', () => {
    expect(AutonomySettingsSchema.safeParse({ mode: 'plan-to-pr' }).success).toBe(true);
  });
  it('should parse guided mode', () => {
    expect(AutonomySettingsSchema.safeParse({ mode: 'guided' }).success).toBe(true);
  });
  it('should reject invalid mode', () => {
    expect(AutonomySettingsSchema.safeParse({ mode: 'yolo' }).success).toBe(false);
  });
  it('should default to guided', () => {
    expect(parseAutonomyMode(undefined)).toBe('guided');
  });
});
