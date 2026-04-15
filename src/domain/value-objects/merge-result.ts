import { z } from "zod";

export const MergeResultSchema = z.object({
	entitiesMerged: z.number().int().nonnegative(),
	artifactsCopied: z.number().int().nonnegative(),
});

export type MergeResult = z.infer<typeof MergeResultSchema>;
