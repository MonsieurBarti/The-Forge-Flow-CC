import { z } from "zod";
export declare const WaveSchema: z.ZodObject<{
    index: z.ZodNumber;
    taskIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type Wave = z.infer<typeof WaveSchema>;
//# sourceMappingURL=wave.d.ts.map