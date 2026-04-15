import { z } from "zod";
export declare const ComplexityTierSchema: z.ZodEnum<{
    S: "S";
    "F-lite": "F-lite";
    "F-full": "F-full";
}>;
export type ComplexityTier = z.infer<typeof ComplexityTierSchema>;
export declare const TierConfigSchema: z.ZodObject<{
    brainstormer: z.ZodBoolean;
    research: z.ZodEnum<{
        optional: "optional";
        skip: "skip";
        required: "required";
    }>;
    freshReviewer: z.ZodLiteral<true>;
    tdd: z.ZodBoolean;
}, z.core.$strip>;
export type TierConfig = z.infer<typeof TierConfigSchema>;
export declare const tierConfig: (tier: ComplexityTier) => TierConfig;
//# sourceMappingURL=complexity-tier.d.ts.map