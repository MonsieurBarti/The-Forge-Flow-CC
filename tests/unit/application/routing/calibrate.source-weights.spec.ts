import { describe, expect, it } from "vitest";
import { calibrateUseCase } from "../../../../src/application/routing/calibrate.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import type { RoutingDecision } from "../../../../src/domain/value-objects/routing-decision.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const D1 = "00000000-0000-4000-8000-000000000001";

const decision: RoutingDecision = {
	decision_id: D1,
	agent: "reviewer",
	confidence: 0.9,
	signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
	fallback_used: false,
	enriched: false,
};

const outcomes: RoutingOutcome[] = Array.from({ length: 5 }, (_, i) => ({
	outcome_id: `00000000-0000-4000-8000-00000000010${i}`,
	decision_id: D1,
	dimension: "tier",
	verdict: "too-low",
	source: "model-judge",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-20T10:00:00.000Z",
}));

const emptySource: OutcomeSource = { async *readOutcomes() {} };
const outcomesSource: OutcomeSource = {
	async *readOutcomes() {
		for (const o of outcomes) yield o;
	},
};
const writer: OutcomeWriter = { append: async () => {} };

describe("calibrateUseCase — source_weights", () => {
	it("uses source_weights when provided", async () => {
		const report = await calibrateUseCase({
			decisions: [decision],
			implicitSource: emptySource,
			outcomesSource,
			writer,
			config: {
				n_min: 2,
				source_weights: { manual: 1.0, "debug-join": 0.5, "model-judge": 0.5 },
			},
			now: () => "2026-04-20T10:00:00.000Z",
		});
		// 5 model-judge outcomes × weight 0.5 = 2.5 effective_total ≥ n_min=2 → cell passes
		expect(report.cells.length).toBeGreaterThanOrEqual(1);
		const agentCell = report.cells.find((c) => c.key.kind === "agent");
		expect(agentCell?.effective_total).toBeCloseTo(2.5);
	});

	it("records implicit_weight_deprecated=true when only implicit_weight is provided", async () => {
		const report = await calibrateUseCase({
			decisions: [decision],
			implicitSource: emptySource,
			outcomesSource,
			writer,
			config: {
				n_min: 2,
				implicit_weight: 0.3,
			},
			now: () => "2026-04-20T10:00:00.000Z",
		});
		expect(report.implicit_weight_deprecated).toBe(true);
		expect(report.source_weights).toEqual({ manual: 1.0, "debug-join": 0.3, "model-judge": 1.0 });
	});

	it("prefers source_weights when both keys are provided", async () => {
		const report = await calibrateUseCase({
			decisions: [decision],
			implicitSource: emptySource,
			outcomesSource,
			writer,
			config: {
				n_min: 2,
				implicit_weight: 0.3,
				source_weights: { manual: 1.0, "debug-join": 0.9, "model-judge": 1.0 },
			},
			now: () => "2026-04-20T10:00:00.000Z",
		});
		expect(report.source_weights?.["debug-join"]).toBe(0.9);
		// implicit_weight_deprecated is still true because the *key* was present in config
		expect(report.implicit_weight_deprecated).toBe(true);
	});
});
