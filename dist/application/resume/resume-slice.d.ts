import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { JournalRepository } from "../../domain/ports/journal-repository.port.js";
import { type Result } from "../../domain/result.js";
import type { CheckpointData } from "../checkpoint/save-checkpoint.js";
export interface ResumeInput {
    sliceId: string;
}
export interface ResumeResult {
    /** The wave index to resume execution from */
    resumeFromWave: number;
    /** Task IDs that have been completed (can be skipped) */
    completedTaskIds: string[];
    /** Task IDs that should be skipped because they're already done */
    skipTasks: string[];
    /** Task IDs that need to be executed next in the resume wave */
    nextTasks: string[];
    /** Whether the journal and checkpoint are consistent */
    consistent: boolean;
    /** Last processed sequence number from the journal */
    lastProcessedSeq: number;
    /** The loaded checkpoint data (for downstream use) */
    checkpoint: CheckpointData;
}
interface ResumeDeps {
    artifactStore: ArtifactStore;
    journal: JournalRepository;
}
/**
 * Resume slice execution after a crash by loading the checkpoint and replaying the journal.
 * This is the core T1 recovery logic - it determines where execution should continue.
 */
export declare const resumeSlice: (input: ResumeInput, deps: ResumeDeps) => Promise<Result<ResumeResult, DomainError>>;
export {};
//# sourceMappingURL=resume-slice.d.ts.map