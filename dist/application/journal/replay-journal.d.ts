import { type DomainError } from "../../domain/errors/domain-error.js";
import type { JournalRepository } from "../../domain/ports/journal-repository.port.js";
import { type Result } from "../../domain/result.js";
interface ReplayInput {
    sliceId: string;
    checkpoint: {
        completedTasks: readonly string[];
        currentWave: number;
    };
}
export interface ReplayResult {
    resumeFromWave: number;
    completedTaskIds: string[];
    lastProcessedSeq: number;
    consistent: boolean;
}
interface ReplayDeps {
    journal: JournalRepository;
}
export declare const replayJournal: (input: ReplayInput, deps: ReplayDeps) => Result<ReplayResult, DomainError>;
export {};
//# sourceMappingURL=replay-journal.d.ts.map