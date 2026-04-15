import { z } from "zod";
export declare const MilestoneStatusSchema: z.ZodEnum<{
    open: "open";
    in_progress: "in_progress";
    closed: "closed";
}>;
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;
//# sourceMappingURL=milestone-status.d.ts.map