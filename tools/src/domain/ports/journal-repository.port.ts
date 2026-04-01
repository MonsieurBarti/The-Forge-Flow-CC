import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { JournalEntry } from '../value-objects/journal-entry.js';

export interface JournalRepository {
  append(sliceId: string, entry: Omit<JournalEntry, 'seq'>): Result<number, DomainError>;
  readAll(sliceId: string): Result<readonly JournalEntry[], DomainError>;
  readSince(sliceId: string, afterSeq: number): Result<readonly JournalEntry[], DomainError>;
  count(sliceId: string): Result<number, DomainError>;
}
