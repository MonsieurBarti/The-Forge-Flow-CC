import { describe, it, expect } from 'vitest';
import { withRetry } from './bd-cli.adapter.js';

describe('withRetry', () => {
  it('should retry on transient failure and succeed', async () => {
    let attempts = 0;
    const flaky = async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
      return 'success';
    };
    const result = await withRetry(flaky, { maxAttempts: 3, baseMs: 10 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should fail after max retries exhausted', async () => {
    const alwaysFails = async () => { throw new Error('permanent'); };
    await expect(withRetry(alwaysFails, { maxAttempts: 3, baseMs: 10 })).rejects.toThrow('permanent');
  });

  it('should succeed on first try without delay', async () => {
    const result = await withRetry(async () => 'immediate', { maxAttempts: 3, baseMs: 10 });
    expect(result).toBe('immediate');
  });
});
