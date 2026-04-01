import { describe, expect, it } from 'vitest';
import { DomainErrorCodeSchema, createDomainError } from './domain-error.js';

describe('journal error codes', () => {
  it('should accept journal error codes', () => {
    for (const code of ['JOURNAL_WRITE_FAILED', 'JOURNAL_READ_FAILED', 'JOURNAL_REPLAY_INCONSISTENT']) {
      expect(DomainErrorCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('should create journal domain errors with context', () => {
    const error = createDomainError('JOURNAL_READ_FAILED', 'Corrupt entry at line 5', { lineNumber: 5 });
    expect(error.code).toBe('JOURNAL_READ_FAILED');
    expect(error.context?.lineNumber).toBe(5);
  });
});
