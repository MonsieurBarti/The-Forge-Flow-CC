import type { ComplexityLevel, RiskLevel, Signals } from "../value-objects/signals.js";
import { type ModelTier, TIER_ORDER } from "../value-objects/tier-decision.js";

export const signalsToPolicyTier = (
	signals: Signals,
	policy: Record<ComplexityLevel | RiskLevel, ModelTier>,
): ModelTier => {
	const ct = policy[signals.complexity];
	const rt = policy[signals.risk.level];
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
