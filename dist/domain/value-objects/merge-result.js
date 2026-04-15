import { z } from "zod";
export const MergeResultSchema = z.object({
    entitiesMerged: z.number().int().nonnegative(),
    artifactsCopied: z.number().int().nonnegative(),
});
//# sourceMappingURL=merge-result.js.map