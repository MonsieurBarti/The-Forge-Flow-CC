import { describe, expect, it } from "vitest";
import { RoutingOutcomeSchema } from "../../../../src/domain/value-objects/routing-outcome.js";

const base = {
	outcome_id: "00000000-0000-4000-8000-000000000aaa",
	decision_id: "00000000-0000-4000-8000-000000000001",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-20T10:00:00.000Z",
};

describe("RoutingOutcomeSchema — model-judge source", () => {
	it("accepts source=model-judge with dimension=agent verdict=ok", () => {
		const parsed = RoutingOutcomeSchema.safeParse({
			...base,
			dimension: "agent",
			verdict: "ok",
			source: "model-judge",
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts source=model-judge with dimension=tier verdict=too-high", () => {
		const parsed = RoutingOutcomeSchema.safeParse({
			...base,
			dimension: "tier",
			verdict: "too-high",
			source: "model-judge",
		});
		expect(parsed.success).toBe(true);
	});

	it("still rejects source=model-judge with dimension=agent verdict=too-low", () => {
		const parsed = RoutingOutcomeSchema.safeParse({
			...base,
			dimension: "agent",
			verdict: "too-low",
			source: "model-judge",
		});
		expect(parsed.success).toBe(false);
	});

	it("rejects source=bogus-string", () => {
		const parsed = RoutingOutcomeSchema.safeParse({
			...base,
			dimension: "agent",
			verdict: "ok",
			source: "bogus",
		});
		expect(parsed.success).toBe(false);
	});
});
