import { describe, expect, it } from "vitest";
import { calibrateUseCase } from "../../../../src/application/routing/calibrate.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import type { RoutingDecision } from "../../../../src/domain/value-objects/routing-decision.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const decision: RoutingDecision = {
	agent: "tff-code-reviewer",
	confidence: 0.9,
	signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
	fallback_used: false,
	enriched: false,
	decision_id: "00000000-0000-4000-8000-000000000001",
};

const manualTierTooLow: RoutingOutcome = {
	outcome_id: "00000000-0000-4000-8000-0000000000a1",
	decision_id: decision.decision_id,
	dimension: "tier",
	verdict: "too-low",
	source: "manual",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T10:00:00.000Z",
};

const arraySource = (items: RoutingOutcome[]): OutcomeSource => ({
	readOutcomes: async function* () {
		for (const o of items) yield o;
	},
});

const emptyWriter: OutcomeWriter = { append: async () => {} };

describe("calibrateUseCase", () => {
	it("produces an empty report when no decisions or outcomes exist", async () => {
		const report = await calibrateUseCase({
			decisions: [],
			implicitSource: arraySource([]),
			outcomesSource: arraySource([]),
			writer: emptyWriter,
			config: { n_min: 5, implicit_weight: 0.5 },
			now: () => "2026-04-19T11:00:00.000Z",
		});
		expect(report.cells).toEqual([]);
		expect(report.recommendations).toEqual([]);
	});

	it("produces cells and insufficient-evidence skips below N_min", async () => {
		const report = await calibrateUseCase({
			decisions: [decision],
			implicitSource: arraySource([]),
			outcomesSource: arraySource([manualTierTooLow]),
			writer: emptyWriter,
			config: { n_min: 5, implicit_weight: 0.5 },
			now: () => "2026-04-19T11:00:00.000Z",
		});
		expect(report.cells).toHaveLength(0);
		expect(report.skipped_cells.length).toBeGreaterThan(0);
		expect(report.recommendations).toEqual([]);
	});

	it("emits a tier-too-low-dominant recommendation when N_min met", async () => {
		const outcomes: RoutingOutcome[] = Array.from({ length: 6 }, (_, i) => ({
			...manualTierTooLow,
			outcome_id: `00000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`,
			verdict: i < 5 ? "too-low" : "too-high",
		}));
		const report = await calibrateUseCase({
			decisions: [decision],
			implicitSource: arraySource([]),
			outcomesSource: arraySource(outcomes),
			writer: emptyWriter,
			config: { n_min: 5, implicit_weight: 0.5 },
			now: () => "2026-04-19T11:00:00.000Z",
		});
		expect(report.recommendations.some((r) => r.rule_id === "tier-too-low-dominant")).toBe(true);
	});

	it("scans implicit source first and writes new debug-join outcomes", async () => {
		const debugJoin: RoutingOutcome = {
			outcome_id: "00000000-0000-4000-8000-0000000000b1",
			decision_id: decision.decision_id,
			dimension: "unknown",
			verdict: "wrong",
			source: "debug-join",
			slice_id: "M01-S01",
			workflow_id: "tff:ship",
			emitted_at: "2026-04-19T11:00:00.000Z",
		};
		const written: RoutingOutcome[] = [];
		const writer: OutcomeWriter = { append: async (o) => void written.push(o) };

		await calibrateUseCase({
			decisions: [decision],
			implicitSource: arraySource([debugJoin]),
			outcomesSource: arraySource([]),
			writer,
			config: { n_min: 5, implicit_weight: 0.5 },
			now: () => "2026-04-19T11:00:00.000Z",
		});
		expect(written).toContainEqual(debugJoin);
	});
});
