import { z } from "zod";
export declare const TaskStartedEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-started">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    agentIdentity: z.ZodString;
}, z.core.$strip>;
export type TaskStartedEntry = z.infer<typeof TaskStartedEntrySchema>;
export declare const TaskCompletedEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-completed">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    durationMs: z.ZodNumber;
    commitHash: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TaskCompletedEntry = z.infer<typeof TaskCompletedEntrySchema>;
export declare const TaskFailedEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-failed">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    errorCode: z.ZodString;
    errorMessage: z.ZodString;
    retryable: z.ZodBoolean;
}, z.core.$strip>;
export type TaskFailedEntry = z.infer<typeof TaskFailedEntrySchema>;
export declare const FileWrittenEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"file-written">;
    taskId: z.ZodString;
    filePath: z.ZodString;
    operation: z.ZodEnum<{
        created: "created";
        modified: "modified";
        deleted: "deleted";
    }>;
}, z.core.$strip>;
export type FileWrittenEntry = z.infer<typeof FileWrittenEntrySchema>;
export declare const CheckpointSavedEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"checkpoint-saved">;
    waveIndex: z.ZodNumber;
    completedTaskCount: z.ZodNumber;
}, z.core.$strip>;
export type CheckpointSavedEntry = z.infer<typeof CheckpointSavedEntrySchema>;
export declare const PhaseChangedEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"phase-changed">;
    from: z.ZodString;
    to: z.ZodString;
}, z.core.$strip>;
export type PhaseChangedEntry = z.infer<typeof PhaseChangedEntrySchema>;
export declare const ArtifactWrittenEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"artifact-written">;
    artifactPath: z.ZodString;
    artifactType: z.ZodEnum<{
        research: "research";
        plan: "plan";
        spec: "spec";
        checkpoint: "checkpoint";
    }>;
}, z.core.$strip>;
export type ArtifactWrittenEntry = z.infer<typeof ArtifactWrittenEntrySchema>;
export declare const GuardrailViolationEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"guardrail-violation">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    violations: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        message: z.ZodString;
        severity: z.ZodString;
    }, z.core.$strip>>;
    action: z.ZodEnum<{
        blocked: "blocked";
        warned: "warned";
    }>;
}, z.core.$strip>;
export type GuardrailViolationEntry = z.infer<typeof GuardrailViolationEntrySchema>;
export declare const OverseerInterventionEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"overseer-intervention">;
    taskId: z.ZodString;
    strategy: z.ZodString;
    reason: z.ZodString;
    action: z.ZodEnum<{
        aborted: "aborted";
        retrying: "retrying";
        escalated: "escalated";
    }>;
    retryCount: z.ZodNumber;
}, z.core.$strip>;
export type OverseerInterventionEntry = z.infer<typeof OverseerInterventionEntrySchema>;
export declare const ExecutionLifecycleEntrySchema: z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"execution-lifecycle">;
    sessionId: z.ZodString;
    action: z.ZodEnum<{
        started: "started";
        paused: "paused";
        resumed: "resumed";
        completed: "completed";
        failed: "failed";
    }>;
    resumeCount: z.ZodNumber;
    failureReason: z.ZodOptional<z.ZodString>;
    wavesCompleted: z.ZodOptional<z.ZodNumber>;
    totalWaves: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ExecutionLifecycleEntry = z.infer<typeof ExecutionLifecycleEntrySchema>;
export declare const JournalEntrySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-started">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    agentIdentity: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-completed">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    durationMs: z.ZodNumber;
    commitHash: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"task-failed">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    errorCode: z.ZodString;
    errorMessage: z.ZodString;
    retryable: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"file-written">;
    taskId: z.ZodString;
    filePath: z.ZodString;
    operation: z.ZodEnum<{
        created: "created";
        modified: "modified";
        deleted: "deleted";
    }>;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"checkpoint-saved">;
    waveIndex: z.ZodNumber;
    completedTaskCount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"phase-changed">;
    from: z.ZodString;
    to: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"artifact-written">;
    artifactPath: z.ZodString;
    artifactType: z.ZodEnum<{
        research: "research";
        plan: "plan";
        spec: "spec";
        checkpoint: "checkpoint";
    }>;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"guardrail-violation">;
    taskId: z.ZodString;
    waveIndex: z.ZodNumber;
    violations: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        message: z.ZodString;
        severity: z.ZodString;
    }, z.core.$strip>>;
    action: z.ZodEnum<{
        blocked: "blocked";
        warned: "warned";
    }>;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"overseer-intervention">;
    taskId: z.ZodString;
    strategy: z.ZodString;
    reason: z.ZodString;
    action: z.ZodEnum<{
        aborted: "aborted";
        retrying: "retrying";
        escalated: "escalated";
    }>;
    retryCount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    seq: z.ZodNumber;
    sliceId: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"execution-lifecycle">;
    sessionId: z.ZodString;
    action: z.ZodEnum<{
        started: "started";
        paused: "paused";
        resumed: "resumed";
        completed: "completed";
        failed: "failed";
    }>;
    resumeCount: z.ZodNumber;
    failureReason: z.ZodOptional<z.ZodString>;
    wavesCompleted: z.ZodOptional<z.ZodNumber>;
    totalWaves: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "type">;
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
//# sourceMappingURL=journal-entry.d.ts.map