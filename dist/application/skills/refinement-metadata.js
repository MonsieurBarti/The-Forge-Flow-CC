import { z } from "zod";
export const RefinementMetadataSchema = z.object({
    skillName: z.string().min(1),
    refinedAt: z.string(),
    driftScore: z.number().min(0).max(1),
});
export function canRefine(skillName, metadata, opts) {
    const lastRefinement = metadata
        .filter((m) => m.skillName === skillName)
        .sort((a, b) => new Date(b.refinedAt).getTime() - new Date(a.refinedAt).getTime())[0];
    if (!lastRefinement)
        return true;
    const daysSince = (Date.now() - new Date(lastRefinement.refinedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= opts.cooldownDays;
}
export function recordRefinement(skillName, driftScore) {
    return { skillName, refinedAt: new Date().toISOString(), driftScore };
}
//# sourceMappingURL=refinement-metadata.js.map