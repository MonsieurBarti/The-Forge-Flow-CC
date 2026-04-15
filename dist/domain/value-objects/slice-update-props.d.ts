import { z } from "zod";
export declare const SliceUpdatePropsSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    tier: z.ZodOptional<z.ZodEnum<{
        S: "S";
        "F-lite": "F-lite";
        "F-full": "F-full";
    }>>;
}, z.core.$strip>;
export type SliceUpdateProps = z.infer<typeof SliceUpdatePropsSchema>;
//# sourceMappingURL=slice-update-props.d.ts.map