import type { ComplexityLevel, RiskLevel, Signals } from "../value-objects/signals.js";
import { type ModelTier, TIER_ORDER } from "../value-objects/tier-decision.js";

const LEVEL_TO_TIER: Record<ComplexityLevel | RiskLevel, ModelTier> = {
	low: "haiku",
	medium: "sonnet",
	high: "opus",
};

export const signalsToPolicyTier = (signals: Signals): ModelTier => {
	const ct = LEVEL_TO_TIER[signals.complexity];
	const rt = LEVEL_TO_TIER[signals.risk.level];
	return TIER_ORDER[ct] >= TIER_ORDER[rt] ? ct : rt;
};

export const resolveEffectiveTier = (
	policyTier: ModelTier,
	minTier: ModelTier,
): { tier: ModelTier; min_tier_applied: boolean } => {
	if (TIER_ORDER[policyTier] >= TIER_ORDER[minTier]) {
		return { tier: policyTier, min_tier_applied: false };
	}
	return { tier: minTier, min_tier_applied: true };
};
