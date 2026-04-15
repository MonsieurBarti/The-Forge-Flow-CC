import type { ArtifactWrittenEntry, CheckpointSavedEntry, ExecutionLifecycleEntry, FileWrittenEntry, GuardrailViolationEntry, OverseerInterventionEntry, PhaseChangedEntry, TaskCompletedEntry, TaskFailedEntry, TaskStartedEntry } from "./journal-entry.js";
export declare class JournalEntryBuilder {
    private _sliceId;
    private _timestamp;
    private _correlationId;
    withSliceId(id: string): this;
    withTimestamp(ts: string): this;
    withCorrelationId(id: string): this;
    buildTaskStarted(overrides?: Partial<{
        taskId: string;
        waveIndex: number;
        agentIdentity: string;
    }>): Omit<TaskStartedEntry, "seq">;
    buildTaskCompleted(overrides?: Partial<{
        taskId: string;
        waveIndex: number;
        durationMs: number;
        commitHash: string;
    }>): Omit<TaskCompletedEntry, "seq">;
    buildTaskFailed(overrides?: Partial<{
        taskId: string;
        waveIndex: number;
        errorCode: string;
        errorMessage: string;
        retryable: boolean;
    }>): Omit<TaskFailedEntry, "seq">;
    buildFileWritten(overrides?: Partial<{
        taskId: string;
        filePath: string;
        operation: "created" | "modified" | "deleted";
    }>): Omit<FileWrittenEntry, "seq">;
    buildCheckpointSaved(overrides?: Partial<{
        waveIndex: number;
        completedTaskCount: number;
    }>): Omit<CheckpointSavedEntry, "seq">;
    buildPhaseChanged(overrides?: Partial<{
        from: string;
        to: string;
    }>): Omit<PhaseChangedEntry, "seq">;
    buildArtifactWritten(overrides?: Partial<{
        artifactPath: string;
        artifactType: "spec" | "plan" | "research" | "checkpoint";
    }>): Omit<ArtifactWrittenEntry, "seq">;
    buildGuardrailViolation(overrides?: Partial<{
        taskId: string;
        waveIndex: number;
        action: "blocked" | "warned";
    }>): Omit<GuardrailViolationEntry, "seq">;
    buildOverseerIntervention(overrides?: Partial<{
        taskId: string;
        strategy: string;
        reason: string;
        action: "aborted" | "retrying" | "escalated";
        retryCount: number;
    }>): Omit<OverseerInterventionEntry, "seq">;
    buildExecutionLifecycle(overrides?: Partial<{
        sessionId: string;
        action: "started" | "paused" | "resumed" | "completed" | "failed";
        resumeCount: number;
        failureReason: string;
    }>): Omit<ExecutionLifecycleEntry, "seq">;
}
//# sourceMappingURL=journal-entry.builder.d.ts.map