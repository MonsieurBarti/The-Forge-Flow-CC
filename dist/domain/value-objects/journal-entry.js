import { z } from "zod";
const JournalEntryBaseSchema = z.object({
    seq: z.number().int().min(0),
    sliceId: z.string().min(1),
    timestamp: z.string().datetime(),
    correlationId: z.string().min(1).optional(),
});
export const TaskStartedEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("task-started"),
    taskId: z.string().min(1),
    waveIndex: z.number().int().min(0),
    agentIdentity: z.string().min(1),
});
export const TaskCompletedEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("task-completed"),
    taskId: z.string().min(1),
    waveIndex: z.number().int().min(0),
    durationMs: z.number().int().min(0),
    commitHash: z.string().optional(),
});
export const TaskFailedEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("task-failed"),
    taskId: z.string().min(1),
    waveIndex: z.number().int().min(0),
    errorCode: z.string(),
    errorMessage: z.string(),
    retryable: z.boolean(),
});
export const FileWrittenEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("file-written"),
    taskId: z.string().min(1),
    filePath: z.string().min(1),
    operation: z.enum(["created", "modified", "deleted"]),
});
export const CheckpointSavedEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("checkpoint-saved"),
    waveIndex: z.number().int().min(0),
    completedTaskCount: z.number().int().min(0),
});
export const PhaseChangedEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("phase-changed"),
    from: z.string(),
    to: z.string(),
});
export const ArtifactWrittenEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("artifact-written"),
    artifactPath: z.string().min(1),
    artifactType: z.enum(["spec", "plan", "research", "checkpoint"]),
});
const GuardrailViolationItemSchema = z.object({
    ruleId: z.string(),
    message: z.string(),
    severity: z.string(),
});
export const GuardrailViolationEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("guardrail-violation"),
    taskId: z.string().min(1),
    waveIndex: z.number().int().min(0),
    violations: z.array(GuardrailViolationItemSchema),
    action: z.enum(["blocked", "warned"]),
});
export const OverseerInterventionEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("overseer-intervention"),
    taskId: z.string().min(1),
    strategy: z.string().min(1),
    reason: z.string().min(1),
    action: z.enum(["aborted", "retrying", "escalated"]),
    retryCount: z.number().int().min(0),
});
export const ExecutionLifecycleEntrySchema = JournalEntryBaseSchema.extend({
    type: z.literal("execution-lifecycle"),
    sessionId: z.string().min(1),
    action: z.enum(["started", "paused", "resumed", "completed", "failed"]),
    resumeCount: z.number().int().min(0),
    failureReason: z.string().optional(),
    wavesCompleted: z.number().int().min(0).optional(),
    totalWaves: z.number().int().min(0).optional(),
});
export const JournalEntrySchema = z.discriminatedUnion("type", [
    TaskStartedEntrySchema,
    TaskCompletedEntrySchema,
    TaskFailedEntrySchema,
    FileWrittenEntrySchema,
    CheckpointSavedEntrySchema,
    PhaseChangedEntrySchema,
    ArtifactWrittenEntrySchema,
    GuardrailViolationEntrySchema,
    OverseerInterventionEntrySchema,
    ExecutionLifecycleEntrySchema,
]);
//# sourceMappingURL=journal-entry.js.map