import { describe, expect, it } from 'vitest';
import { InMemoryJournalAdapter } from './in-memory-journal.adapter.js';

describe('InMemoryJournalAdapter', () => {
  it('can be instantiated', () => {
    const adapter = new InMemoryJournalAdapter();
    expect(adapter).toBeDefined();
  });

  it('has seed and reset methods', () => {
    const adapter = new InMemoryJournalAdapter();
    expect(typeof adapter.seed).toBe('function');
    expect(typeof adapter.reset).toBe('function');
  });
});
