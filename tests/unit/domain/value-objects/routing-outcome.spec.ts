import { describe, expect, it } from "vitest";
import { RoutingOutcomeSchema } from "../../../../src/domain/value-objects/routing-outcome.js";

const valid = {
	outcome_id: "00000000-0000-4000-8000-000000000001",
	decision_id: "00000000-0000-4000-8000-000000000002",
	dimension: "tier",
	verdict: "too-low",
	source: "manual",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T10:00:00.000Z",
} as const;

describe("RoutingOutcomeSchema", () => {
	it("accepts a valid tier/too-low outcome", () => {
		expect(() => RoutingOutcomeSchema.parse(valid)).not.toThrow();
	});

	it("allows agent dimension with ok/wrong verdicts only", () => {
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "agent", verdict: "ok" }),
		).not.toThrow();
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "agent", verdict: "wrong" }),
		).not.toThrow();
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "agent", verdict: "too-low" }),
		).toThrow();
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "agent", verdict: "too-high" }),
		).toThrow();
	});

	it("allows tier dimension with ok/wrong/too-low/too-high", () => {
		for (const verdict of ["ok", "wrong", "too-low", "too-high"] as const) {
			expect(() =>
				RoutingOutcomeSchema.parse({ ...valid, dimension: "tier", verdict }),
			).not.toThrow();
		}
	});

	it("allows unknown dimension with wrong verdict only", () => {
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "unknown", verdict: "wrong" }),
		).not.toThrow();
		expect(() =>
			RoutingOutcomeSchema.parse({ ...valid, dimension: "unknown", verdict: "ok" }),
		).toThrow();
	});

	it("rejects reason longer than 500 chars", () => {
		expect(() => RoutingOutcomeSchema.parse({ ...valid, reason: "x".repeat(501) })).toThrow();
	});

	it("requires uuid format on outcome_id and decision_id", () => {
		expect(() => RoutingOutcomeSchema.parse({ ...valid, outcome_id: "not-a-uuid" })).toThrow();
		expect(() => RoutingOutcomeSchema.parse({ ...valid, decision_id: "not-a-uuid" })).toThrow();
	});

	it("refinement error names the rejected verdict and points path at verdict", () => {
		const result = RoutingOutcomeSchema.safeParse({
			...valid,
			dimension: "agent",
			verdict: "too-low",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues[0];
			expect(issue.path).toContain("verdict");
			expect(issue.message).toContain("too-low");
		}
	});
});
