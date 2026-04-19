import { describe, expect, it } from "vitest";
import {
	runAllRules,
	tierTooHighDominant,
	tierTooLowDominant,
} from "../../../../src/domain/helpers/calibration-rules.js";
import type { CalibrationCell } from "../../../../src/domain/value-objects/calibration-report.js";

const cell = (over: Partial<CalibrationCell>): CalibrationCell => ({
	key: { kind: "agent", value: "tff-code-reviewer" },
	total: 5,
	effective_total: 5,
	effective_wrong: 0,
	verdict_breakdown: { ok: 0, wrong: 0, too_low: 0, too_high: 0 },
	sample_decision_ids: [],
	...over,
});

describe("tierTooLowDominant", () => {
	it("fires when too-low dominates and N_min met", () => {
		const recs = tierTooLowDominant(
			cell({
				total: 6,
				effective_total: 6,
				verdict_breakdown: { ok: 0, wrong: 0, too_low: 5, too_high: 1 },
			}),
			{ n_min: 5 },
		);
		expect(recs).toHaveLength(1);
		expect(recs[0].rule_id).toBe("tier-too-low-dominant");
		expect(recs[0].severity).toBe("suggest");
	});

	it("does not fire below N_min", () => {
		const recs = tierTooLowDominant(
			cell({
				total: 3,
				effective_total: 3,
				verdict_breakdown: { ok: 0, wrong: 0, too_low: 3, too_high: 0 },
			}),
			{ n_min: 5 },
		);
		expect(recs).toEqual([]);
	});

	it("does not fire when no directional verdicts exist", () => {
		const recs = tierTooLowDominant(
			cell({
				total: 6,
				effective_total: 6,
				verdict_breakdown: { ok: 4, wrong: 2, too_low: 0, too_high: 0 },
			}),
			{ n_min: 5 },
		);
		expect(recs).toEqual([]);
	});

	it("does not fire when ratio below 0.66", () => {
		const recs = tierTooLowDominant(
			cell({
				total: 6,
				effective_total: 6,
				verdict_breakdown: { ok: 0, wrong: 0, too_low: 3, too_high: 3 },
			}),
			{ n_min: 5 },
		);
		expect(recs).toEqual([]);
	});
});

describe("tierTooHighDominant", () => {
	it("fires when too-high dominates and N_min met", () => {
		const recs = tierTooHighDominant(
			cell({
				total: 7,
				effective_total: 7,
				verdict_breakdown: { ok: 0, wrong: 0, too_low: 1, too_high: 6 },
			}),
			{ n_min: 5 },
		);
		expect(recs).toHaveLength(1);
		expect(recs[0].rule_id).toBe("tier-too-high-dominant");
	});
});

describe("runAllRules", () => {
	it("collects recommendations from all rules into one array", () => {
		const recs = runAllRules(
			cell({
				total: 6,
				effective_total: 6,
				verdict_breakdown: { ok: 0, wrong: 0, too_low: 5, too_high: 1 },
			}),
			{ n_min: 5 },
		);
		const ids = recs.map((r) => r.rule_id);
		expect(ids).toContain("tier-too-low-dominant");
		expect(ids).not.toContain("tier-too-high-dominant");
	});
});
