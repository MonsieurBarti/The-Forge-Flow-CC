import { z } from "zod";
export declare const RefinementMetadataSchema: z.ZodObject<{
    skillName: z.ZodString;
    refinedAt: z.ZodString;
    driftScore: z.ZodNumber;
}, z.core.$strip>;
export type RefinementMetadata = z.infer<typeof RefinementMetadataSchema>;
export declare function canRefine(skillName: string, metadata: RefinementMetadata[], opts: {
    cooldownDays: number;
}): boolean;
export declare function recordRefinement(skillName: string, driftScore: number): RefinementMetadata;
//# sourceMappingURL=refinement-metadata.d.ts.map