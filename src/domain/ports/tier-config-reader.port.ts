import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { RiskLevel } from "../value-objects/signals.js";
import type { ModelTier } from "../value-objects/tier-decision.js";

export const DEFAULT_TIER_POLICY: Record<RiskLevel, ModelTier> = {
	low: "haiku",
	medium: "sonnet",
	high: "opus",
};

export interface TierConfigReader {
	readTierPolicy(): Promise<Result<Record<RiskLevel, ModelTier>, DomainError>>;
	readAgentMinTier(agent_id: string): Promise<Result<ModelTier, DomainError>>;
}
