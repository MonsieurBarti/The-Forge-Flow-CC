import { describe, expect, it } from "vitest";
import { RoutingDecisionSchema } from "../../../../src/domain/value-objects/routing-decision.js";

describe("RoutingDecisionSchema", () => {
	const baseSignals = { complexity: "low", risk: { level: "low", tags: [] } };

	it("parses a valid decision", () => {
		const parsed = RoutingDecisionSchema.parse({
			agent: "tff-code-reviewer",
			confidence: 0.85,
			signals: baseSignals,
			fallback_used: false,
			enriched: false,
		});
		expect(parsed.agent).toBe("tff-code-reviewer");
		expect(parsed.confidence).toBeCloseTo(0.85);
	});

	it("rejects confidence outside [0, 1]", () => {
		expect(() =>
			RoutingDecisionSchema.parse({
				agent: "x",
				confidence: 1.5,
				signals: baseSignals,
				fallback_used: false,
				enriched: false,
			}),
		).toThrow();

		expect(() =>
			RoutingDecisionSchema.parse({
				agent: "x",
				confidence: -0.1,
				signals: baseSignals,
				fallback_used: false,
				enriched: false,
			}),
		).toThrow();
	});
});
