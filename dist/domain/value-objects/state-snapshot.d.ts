import { z } from "zod";
/**
 * Schema version for state snapshot migrations.
 * Increment when adding breaking changes to snapshot structure.
 */
export declare const STATE_SNAPSHOT_VERSION = 1;
/**
 * Complete state snapshot for export/import.
 * Contains all entities needed to reconstruct a project's state.
 */
export declare const StateSnapshotSchema: z.ZodObject<{
    version: z.ZodNumber;
    exportedAt: z.ZodString;
    project: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        vision: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
    }, z.core.$strip>>;
    milestones: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        projectId: z.ZodString;
        name: z.ZodString;
        number: z.ZodNumber;
        status: z.ZodEnum<{
            open: "open";
            in_progress: "in_progress";
            closed: "closed";
        }>;
        closeReason: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
    }, z.core.$strip>>;
    slices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        milestoneId: z.ZodString;
        number: z.ZodNumber;
        title: z.ZodString;
        status: z.ZodEnum<{
            closed: "closed";
            discussing: "discussing";
            researching: "researching";
            planning: "planning";
            executing: "executing";
            verifying: "verifying";
            reviewing: "reviewing";
            completing: "completing";
        }>;
        tier: z.ZodOptional<z.ZodEnum<{
            S: "S";
            "F-lite": "F-lite";
            "F-full": "F-full";
        }>>;
        createdAt: z.ZodDate;
    }, z.core.$strip>>;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sliceId: z.ZodString;
        number: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<{
            open: "open";
            in_progress: "in_progress";
            closed: "closed";
        }>;
        wave: z.ZodOptional<z.ZodNumber>;
        claimedAt: z.ZodOptional<z.ZodDate>;
        claimedBy: z.ZodOptional<z.ZodString>;
        closedReason: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
    }, z.core.$strip>>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        fromId: z.ZodString;
        toId: z.ZodString;
        type: z.ZodLiteral<"blocks">;
    }, z.core.$strip>>>;
    workflowSession: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        phase: z.ZodString;
        activeSliceId: z.ZodOptional<z.ZodString>;
        activeMilestoneId: z.ZodOptional<z.ZodString>;
        pausedAt: z.ZodOptional<z.ZodString>;
        contextJson: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    reviews: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sliceId: z.ZodString;
        type: z.ZodEnum<{
            code: "code";
            spec: "spec";
            security: "security";
        }>;
        reviewer: z.ZodString;
        verdict: z.ZodEnum<{
            approved: "approved";
            changes_requested: "changes_requested";
        }>;
        commitSha: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;
/**
 * Migrate a raw snapshot to the current schema version.
 * @throws Error if migration path doesn't exist or version is unsupported
 */
export declare function migrateSnapshot(raw: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=state-snapshot.d.ts.map