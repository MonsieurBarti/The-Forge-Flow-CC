import { z } from "zod";
export declare const MilestonePropsSchema: z.ZodObject<{
    number: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strip>;
export type MilestoneProps = z.infer<typeof MilestonePropsSchema>;
//# sourceMappingURL=milestone-props.d.ts.map