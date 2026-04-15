import { z } from "zod";
export declare const MilestoneUpdatePropsSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        open: "open";
        in_progress: "in_progress";
        closed: "closed";
    }>>;
}, z.core.$strip>;
export type MilestoneUpdateProps = z.infer<typeof MilestoneUpdatePropsSchema>;
//# sourceMappingURL=milestone-update-props.d.ts.map