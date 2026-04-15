import { z } from "zod";
export declare const SlicePropsSchema: z.ZodObject<{
    milestoneId: z.ZodString;
    number: z.ZodNumber;
    title: z.ZodString;
    tier: z.ZodOptional<z.ZodEnum<{
        S: "S";
        "F-lite": "F-lite";
        "F-full": "F-full";
    }>>;
}, z.core.$strip>;
export type SliceProps = z.infer<typeof SlicePropsSchema>;
//# sourceMappingURL=slice-props.d.ts.map