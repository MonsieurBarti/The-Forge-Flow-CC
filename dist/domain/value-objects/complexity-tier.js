import { z } from "zod";
export const ComplexityTierSchema = z.enum(["S", "F-lite", "F-full"]);
export const TierConfigSchema = z.object({
    brainstormer: z.boolean(),
    research: z.enum(["skip", "optional", "required"]),
    freshReviewer: z.literal(true),
    tdd: z.boolean(),
});
const configs = {
    S: {
        brainstormer: false,
        research: "skip",
        freshReviewer: true,
        tdd: false,
    },
    "F-lite": {
        brainstormer: true,
        research: "optional",
        freshReviewer: true,
        tdd: true,
    },
    "F-full": {
        brainstormer: true,
        research: "required",
        freshReviewer: true,
        tdd: true,
    },
};
export const tierConfig = (tier) => configs[tier];
//# sourceMappingURL=complexity-tier.js.map