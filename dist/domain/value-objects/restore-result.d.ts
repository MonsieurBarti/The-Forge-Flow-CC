import { z } from "zod";
export declare const RestoreResultSchema: z.ZodObject<{
    filesRestored: z.ZodNumber;
    schemaVersion: z.ZodNumber;
    source: z.ZodOptional<z.ZodEnum<{
        json: "json";
        files: "files";
    }>>;
}, z.core.$strip>;
export type RestoreResult = z.infer<typeof RestoreResultSchema>;
//# sourceMappingURL=restore-result.d.ts.map