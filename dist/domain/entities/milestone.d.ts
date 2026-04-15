import { z } from "zod";
import { type MilestoneStatus, MilestoneStatusSchema } from "../value-objects/milestone-status.js";
export { type MilestoneStatus, MilestoneStatusSchema };
export declare const MilestoneSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export declare const createMilestone: (input: {
    projectId: string;
    name: string;
    number: number;
}) => Milestone;
export declare const formatMilestoneNumber: (n: number) => string;
//# sourceMappingURL=milestone.d.ts.map