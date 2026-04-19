import { z } from "zod";
import { SignalsSchema } from "./signals.js";

export const ModelTierSchema = z.enum(["haiku", "sonnet", "opus"]);
export type ModelTier = z.infer<typeof ModelTierSchema>;

export const TIER_ORDER: Record<ModelTier, number> = { haiku: 0, sonnet: 1, opus: 2 };

export const TierDecisionSchema = z.object({
	tier: ModelTierSchema,
	policy_tier: ModelTierSchema,
	min_tier_applied: z.boolean(),
	agent_id: z.string().min(1),
	decision_id: z.string().uuid(),
	signals: SignalsSchema,
});
export type TierDecision = z.infer<typeof TierDecisionSchema>;
