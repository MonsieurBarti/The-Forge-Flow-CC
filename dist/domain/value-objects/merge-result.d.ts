import { z } from "zod";
export declare const MergeResultSchema: z.ZodObject<{
    entitiesMerged: z.ZodNumber;
    artifactsCopied: z.ZodNumber;
}, z.core.$strip>;
export type MergeResult = z.infer<typeof MergeResultSchema>;
//# sourceMappingURL=merge-result.d.ts.map