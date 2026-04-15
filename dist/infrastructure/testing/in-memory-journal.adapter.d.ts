import type { DomainError } from "../../domain/errors/domain-error.js";
import type { JournalRepository } from "../../domain/ports/journal-repository.port.js";
import type { Result } from "../../domain/result.js";
import { type JournalEntry } from "../../domain/value-objects/journal-entry.js";
export declare class InMemoryJournalAdapter implements JournalRepository {
    private store;
    append(sliceId: string, entry: Omit<JournalEntry, "seq">): Result<number, DomainError>;
    readAll(sliceId: string): Result<readonly JournalEntry[], DomainError>;
    readSince(sliceId: string, afterSeq: number): Result<readonly JournalEntry[], DomainError>;
    count(sliceId: string): Result<number, DomainError>;
    seed(sliceId: string, entries: JournalEntry[]): void;
    reset(): void;
}
//# sourceMappingURL=in-memory-journal.adapter.d.ts.map