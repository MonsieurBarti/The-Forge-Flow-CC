import { z } from "zod";

export const ComplexityTierSchema = z.enum(["S", "SS", "SSS"]);
export type ComplexityTier = z.infer<typeof ComplexityTierSchema>;

export const TierConfigSchema = z.object({
	brainstormer: z.boolean(),
	research: z.enum(["skip", "optional", "required"]),
	freshReviewer: z.literal(true),
	tdd: z.boolean(),
});

export type TierConfig = z.infer<typeof TierConfigSchema>;

const configs: Record<ComplexityTier, TierConfig> = {
	S: {
		brainstormer: false,
		research: "skip",
		freshReviewer: true,
		tdd: false,
	},
	SS: {
		brainstormer: true,
		research: "optional",
		freshReviewer: true,
		tdd: true,
	},
	SSS: {
		brainstormer: true,
		research: "required",
		freshReviewer: true,
		tdd: true,
	},
};

export const tierConfig = (tier: ComplexityTier): TierConfig => configs[tier];
