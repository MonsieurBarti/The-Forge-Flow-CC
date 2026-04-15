import { z } from "zod";
export declare const ObservationSchema: z.ZodObject<{
    ts: z.ZodString;
    session: z.ZodString;
    tool: z.ZodString;
    args: z.ZodNullable<z.ZodString>;
    project: z.ZodString;
}, z.core.$strip>;
export type Observation = z.infer<typeof ObservationSchema>;
//# sourceMappingURL=observation.d.ts.map