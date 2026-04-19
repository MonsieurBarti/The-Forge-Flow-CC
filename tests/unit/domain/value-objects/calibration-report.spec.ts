import { describe, expect, it } from "vitest";
import {
	CalibrationCellSchema,
	CalibrationRecommendationSchema,
	CalibrationReportSchema,
} from "../../../../src/domain/value-objects/calibration-report.js";

describe("CalibrationCellSchema", () => {
	it("accepts a minimal cell", () => {
		const cell = {
			key: { kind: "agent", value: "tff-code-reviewer" },
			total: 3,
			effective_total: 2.5,
			effective_wrong: 1.5,
			verdict_breakdown: { ok: 1, wrong: 2, too_low: 0, too_high: 0 },
			sample_decision_ids: [],
		};
		expect(() => CalibrationCellSchema.parse(cell)).not.toThrow();
	});

	it("rejects cells with negative totals", () => {
		const cell = {
			key: { kind: "tag", value: "auth" },
			total: -1,
			effective_total: 0,
			effective_wrong: 0,
			verdict_breakdown: { ok: 0, wrong: 0, too_low: 0, too_high: 0 },
			sample_decision_ids: [],
		};
		expect(() => CalibrationCellSchema.parse(cell)).toThrow();
	});
});

describe("CalibrationRecommendationSchema", () => {
	it("accepts a minimal recommendation", () => {
		const rec = {
			rule_id: "tier-too-low-dominant",
			cell_key: { kind: "agent", value: "tff-code-reviewer" },
			severity: "suggest",
			message: "raise tier floor",
		};
		expect(() => CalibrationRecommendationSchema.parse(rec)).not.toThrow();
	});
});

describe("CalibrationReportSchema", () => {
	it("accepts an empty report", () => {
		const report = {
			generated_at: "2026-04-19T10:00:00.000Z",
			n_min: 5,
			implicit_weight: 0.5,
			decisions_scanned: 0,
			outcomes_scanned: 0,
			cells: [],
			recommendations: [],
			skipped_cells: [],
		};
		expect(() => CalibrationReportSchema.parse(report)).not.toThrow();
	});
});
