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
			decision_id: "00000000-0000-4000-8000-000000000000",
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
				decision_id: "00000000-0000-4000-8000-000000000000",
			}),
		).toThrow();

		expect(() =>
			RoutingDecisionSchema.parse({
				agent: "x",
				confidence: -0.1,
				signals: baseSignals,
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000000",
			}),
		).toThrow();
	});
});

describe("RoutingDecisionSchema decision_id", () => {
	it("requires a UUID decision_id", () => {
		const base = {
			agent: "tff-code-reviewer",
			confidence: 1,
			signals: { complexity: "low", risk: { level: "low", tags: [] } },
			fallback_used: false,
			enriched: false,
		};
		expect(RoutingDecisionSchema.safeParse(base).success).toBe(false);
		expect(
			RoutingDecisionSchema.safeParse({
				...base,
				decision_id: "00000000-0000-4000-8000-000000000000",
			}).success,
		).toBe(true);
	});

	it("rejects a non-UUID decision_id", () => {
		const res = RoutingDecisionSchema.safeParse({
			agent: "tff-code-reviewer",
			confidence: 1,
			signals: { complexity: "low", risk: { level: "low", tags: [] } },
			fallback_used: false,
			enriched: false,
			decision_id: "not-a-uuid",
		});
		expect(res.success).toBe(false);
	});
});
