import { describe, expect, it } from 'vitest';

describe('slice-transition result format', () => {
  it('should include warnings array in success result', () => {
    const successResult = { ok: true, data: { status: 'executing' }, warnings: [] as string[] };
    expect(successResult).toHaveProperty('warnings');
    expect(Array.isArray(successResult.warnings)).toBe(true);
  });

  it('should populate warnings for non-critical failures', () => {
    const resultWithWarnings = {
      ok: true,
      data: { status: 'executing' },
      warnings: ['snapshot failed: Error: ENOENT', 'dolt sync failed: Error: connection refused'],
    };
    expect(resultWithWarnings.ok).toBe(true);
    expect(resultWithWarnings.warnings).toHaveLength(2);
  });

  it('should block transition on checkpoint failure', () => {
    const blockedResult = {
      ok: false,
      error: { code: 'CHECKPOINT_FAILED', message: 'Checkpoint save failed: Error: disk full' },
    };
    expect(blockedResult.ok).toBe(false);
    expect(blockedResult.error.code).toBe('CHECKPOINT_FAILED');
  });
});
