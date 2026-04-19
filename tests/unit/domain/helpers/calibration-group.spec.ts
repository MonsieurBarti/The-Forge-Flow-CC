import { describe, expect, it } from "vitest";
import { groupOutcomes } from "../../../../src/domain/helpers/calibration-group.js";
import type { RoutingDecision } from "../../../../src/domain/value-objects/routing-decision.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const decisionA: RoutingDecision = {
	agent: "tff-code-reviewer",
	confidence: 0.9,
	signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
	fallback_used: false,
	enriched: false,
	decision_id: "00000000-0000-4000-8000-000000000001",
};

const outcomeA_tier_toolow_manual: RoutingOutcome = {
	outcome_id: "00000000-0000-4000-8000-0000000000a1",
	decision_id: decisionA.decision_id,
	dimension: "tier",
	verdict: "too-low",
	source: "manual",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T10:00:00.000Z",
};

const outcomeA_unknown_debug: RoutingOutcome = {
	outcome_id: "00000000-0000-4000-8000-0000000000a2",
	decision_id: decisionA.decision_id,
	dimension: "unknown",
	verdict: "wrong",
	source: "debug-join",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T11:00:00.000Z",
};

describe("groupOutcomes", () => {
	it("groups outcomes by agent and by tag", () => {
		const { byAgent, byTag } = groupOutcomes({
			decisions: [decisionA],
			outcomes: [outcomeA_tier_toolow_manual, outcomeA_unknown_debug],
			weights: { manual: 1.0, "debug-join": 0.5 },
		});

		const agentCell = byAgent.get("tff-code-reviewer");
		expect(agentCell).toBeDefined();
		expect(agentCell?.total).toBe(2);
		expect(agentCell?.effective_total).toBeCloseTo(1.5); // 1.0 + 0.5
		expect(agentCell?.verdict_breakdown.too_low).toBe(1);
		expect(agentCell?.verdict_breakdown.wrong).toBe(1);
		expect(agentCell?.sample_decision_ids).toContain(decisionA.decision_id);

		const tagCell = byTag.get("auth");
		expect(tagCell).toBeDefined();
		expect(tagCell?.total).toBe(2);
		expect(tagCell?.effective_total).toBeCloseTo(1.5);
	});

	it("caps sample_decision_ids at 10", () => {
		const decisions: RoutingDecision[] = Array.from({ length: 15 }, (_, i) => ({
			...decisionA,
			decision_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
		}));
		const outcomes: RoutingOutcome[] = decisions.map((d, i) => ({
			...outcomeA_tier_toolow_manual,
			outcome_id: `00000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`,
			decision_id: d.decision_id,
		}));
		const { byAgent } = groupOutcomes({
			decisions,
			outcomes,
			weights: { manual: 1.0, "debug-join": 0.5 },
		});
		expect(byAgent.get("tff-code-reviewer")?.sample_decision_ids).toHaveLength(10);
	});

	it("effective_wrong sums weights over non-ok verdicts", () => {
		const { byAgent } = groupOutcomes({
			decisions: [decisionA],
			outcomes: [
				outcomeA_tier_toolow_manual, // manual, not ok → 1.0
				outcomeA_unknown_debug, // debug-join, wrong → 0.5
			],
			weights: { manual: 1.0, "debug-join": 0.5 },
		});
		expect(byAgent.get("tff-code-reviewer")?.effective_wrong).toBeCloseTo(1.5);
	});

	it("returns empty maps when no outcomes match any decision", () => {
		const { byAgent, byTag } = groupOutcomes({
			decisions: [decisionA],
			outcomes: [],
			weights: { manual: 1.0, "debug-join": 0.5 },
		});
		expect(byAgent.size).toBe(0);
		expect(byTag.size).toBe(0);
	});

	it("is deterministic across identical inputs", () => {
		const run = () =>
			groupOutcomes({
				decisions: [decisionA],
				outcomes: [outcomeA_tier_toolow_manual],
				weights: { manual: 1.0, "debug-join": 0.5 },
			});
		expect(JSON.stringify([...run().byAgent])).toEqual(JSON.stringify([...run().byAgent]));
	});
});
