import { z } from "zod";
export declare const PatternSchema: z.ZodObject<{
    sequence: z.ZodArray<z.ZodString>;
    count: z.ZodNumber;
    sessions: z.ZodNumber;
    projects: z.ZodNumber;
    lastSeen: z.ZodString;
}, z.core.$strip>;
export type Pattern = z.infer<typeof PatternSchema>;
//# sourceMappingURL=pattern.d.ts.map