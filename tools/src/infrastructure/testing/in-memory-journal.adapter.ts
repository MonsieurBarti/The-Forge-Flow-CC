import type { DomainError } from '../../domain/errors/domain-error.js';
import type { JournalRepository } from '../../domain/ports/journal-repository.port.js';
import type { Result } from '../../domain/result.js';
import { Ok } from '../../domain/result.js';
import { type JournalEntry, JournalEntrySchema } from '../../domain/value-objects/journal-entry.js';

export class InMemoryJournalAdapter implements JournalRepository {
  private store = new Map<string, JournalEntry[]>();

  append(sliceId: string, entry: Omit<JournalEntry, 'seq'>): Result<number, DomainError> {
    const entries = this.store.get(sliceId) ?? [];
    const seq = entries.length;
    const fullEntry = JournalEntrySchema.parse({ ...entry, seq });
    this.store.set(sliceId, [...entries, fullEntry]);
    return Ok(seq);
  }

  readAll(sliceId: string): Result<readonly JournalEntry[], DomainError> {
    return Ok(this.store.get(sliceId) ?? []);
  }

  readSince(sliceId: string, afterSeq: number): Result<readonly JournalEntry[], DomainError> {
    const entries = this.store.get(sliceId) ?? [];
    return Ok(entries.filter((e) => e.seq > afterSeq));
  }

  count(sliceId: string): Result<number, DomainError> {
    return Ok((this.store.get(sliceId) ?? []).length);
  }

  seed(sliceId: string, entries: JournalEntry[]): void {
    this.store.set(sliceId, entries);
  }

  reset(): void {
    this.store.clear();
  }
}
