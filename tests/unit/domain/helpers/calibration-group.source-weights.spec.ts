import { describe, expect, it } from "vitest";
import { groupOutcomes } from "../../../../src/domain/helpers/calibration-group.js";
import type { RoutingDecision } from "../../../../src/domain/value-objects/routing-decision.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const decision = (id: string, agent: string, tags: string[]): RoutingDecision => ({
	decision_id: id,
	agent,
	confidence: 0.9,
	signals: { complexity: "medium", risk: { level: "low", tags } },
	fallback_used: false,
	enriched: false,
});

const outcome = (
	id: string,
	dec_id: string,
	source: "manual" | "debug-join" | "model-judge",
	verdict: "ok" | "wrong" | "too-low" | "too-high" = "wrong",
	dim: "agent" | "tier" | "unknown" = "tier",
): RoutingOutcome => ({
	outcome_id: id,
	decision_id: dec_id,
	dimension: dim,
	verdict,
	source,
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-20T10:00:00.000Z",
});

const D1 = "00000000-0000-4000-8000-000000000001";

describe("groupOutcomes — source_weights", () => {
	it("applies per-source weights to effective_total and effective_wrong", () => {
		const res = groupOutcomes({
			decisions: [decision(D1, "reviewer", ["auth"])],
			outcomes: [
				outcome("o1", D1, "manual", "wrong", "tier"),
				outcome("o2", D1, "debug-join", "wrong", "unknown"),
				outcome("o3", D1, "model-judge", "wrong", "tier"),
			],
			weights: { manual: 1.0, "debug-join": 0.5, "model-judge": 0.8 },
		});
		const cell = res.byAgent.get("reviewer");
		expect(cell?.total).toBe(3);
		expect(cell?.effective_total).toBeCloseTo(1.0 + 0.5 + 0.8);
		expect(cell?.effective_wrong).toBeCloseTo(1.0 + 0.5 + 0.8);
	});

	it("treats an unknown source key as weight 0 (outcome still counted in total)", () => {
		const res = groupOutcomes({
			decisions: [decision(D1, "reviewer", ["auth"])],
			// @ts-expect-error — simulating corrupt stored source
			outcomes: [outcome("o1", D1, "future-source", "wrong", "tier")],
			weights: { manual: 1.0, "debug-join": 0.5, "model-judge": 1.0 },
		});
		const cell = res.byAgent.get("reviewer");
		expect(cell?.total).toBe(1);
		expect(cell?.effective_total).toBe(0);
		expect(cell?.effective_wrong).toBe(0);
	});

	it("model-judge outcomes populate per-tag cells", () => {
		const res = groupOutcomes({
			decisions: [decision(D1, "reviewer", ["auth", "migrations"])],
			outcomes: [outcome("o1", D1, "model-judge", "too-high", "tier")],
			weights: { manual: 1.0, "debug-join": 0.5, "model-judge": 1.0 },
		});
		expect(res.byTag.get("auth")?.effective_total).toBe(1);
		expect(res.byTag.get("migrations")?.effective_total).toBe(1);
	});
});
