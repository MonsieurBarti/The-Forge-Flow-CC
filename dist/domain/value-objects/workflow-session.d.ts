import { z } from "zod";
export declare const WorkflowSessionSchema: z.ZodObject<{
    phase: z.ZodString;
    activeSliceId: z.ZodOptional<z.ZodString>;
    activeMilestoneId: z.ZodOptional<z.ZodString>;
    pausedAt: z.ZodOptional<z.ZodString>;
    contextJson: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type WorkflowSession = z.infer<typeof WorkflowSessionSchema>;
//# sourceMappingURL=workflow-session.d.ts.map