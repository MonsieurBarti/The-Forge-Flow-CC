import { describe, expect, it } from 'vitest';
import { hookPostCheckoutCmd } from '../../../src/cli/commands/hook-post-checkout.cmd.js';

describe('hookPostCheckoutCmd', () => {
  it('returns INVALID_ARGS when no branch provided', async () => {
    const result = JSON.parse(await hookPostCheckoutCmd([]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_ARGS');
  });
});
