// tests/unit/domain/value-objects/tier-decision.spec.ts
import { describe, expect, it } from "vitest";
import {
	ModelTierSchema,
	TIER_ORDER,
	TierDecisionSchema,
} from "../../../../src/domain/value-objects/tier-decision.js";

describe("ModelTierSchema", () => {
	it("accepts haiku, sonnet, opus", () => {
		expect(ModelTierSchema.parse("haiku")).toBe("haiku");
		expect(ModelTierSchema.parse("sonnet")).toBe("sonnet");
		expect(ModelTierSchema.parse("opus")).toBe("opus");
	});
	it("rejects unknown tiers", () => {
		expect(() => ModelTierSchema.parse("gpt-4")).toThrow();
	});
});

describe("TIER_ORDER", () => {
	it("haiku < sonnet < opus", () => {
		expect(TIER_ORDER.haiku).toBeLessThan(TIER_ORDER.sonnet);
		expect(TIER_ORDER.sonnet).toBeLessThan(TIER_ORDER.opus);
	});
});

describe("TierDecisionSchema", () => {
	it("parses a valid TierDecision", () => {
		const parsed = TierDecisionSchema.parse({
			tier: "sonnet",
			policy_tier: "haiku",
			min_tier_applied: true,
			agent_id: "tff-security-auditor",
			decision_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			signals: { complexity: "low", risk: { level: "low", tags: [] } },
		});
		expect(parsed.tier).toBe("sonnet");
		expect(parsed.min_tier_applied).toBe(true);
	});
	it("rejects non-UUID decision_id", () => {
		expect(() =>
			TierDecisionSchema.parse({
				tier: "sonnet",
				policy_tier: "haiku",
				min_tier_applied: false,
				agent_id: "tff-code-reviewer",
				decision_id: "not-a-uuid",
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
			}),
		).toThrow();
	});
});
