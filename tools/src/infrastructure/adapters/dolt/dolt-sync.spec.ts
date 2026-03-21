import { describe, it, expect } from 'vitest';
import { shouldAutoSync, parseDoltSettings } from './dolt-sync';

describe('dolt-sync', () => {
  it('should detect auto-sync enabled', () => {
    expect(shouldAutoSync({ dolt: { remote: 'origin', 'auto-sync': true } })).toBe(true);
  });

  it('should detect auto-sync disabled', () => {
    expect(shouldAutoSync({ dolt: { remote: 'origin', 'auto-sync': false } })).toBe(false);
  });

  it('should handle missing dolt settings', () => {
    expect(shouldAutoSync({})).toBe(false);
    expect(shouldAutoSync(undefined)).toBe(false);
  });

  it('should parse dolt remote', () => {
    const parsed = parseDoltSettings({ dolt: { remote: 'origin', 'auto-sync': true } });
    expect(parsed?.remote).toBe('origin');
    expect(parsed?.autoSync).toBe(true);
  });

  it('should return null for missing settings', () => {
    expect(parseDoltSettings({})).toBeNull();
  });
});
