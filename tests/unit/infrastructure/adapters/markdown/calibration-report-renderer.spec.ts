import { describe, expect, it } from "vitest";
import type { CalibrationReport } from "../../../../../src/domain/value-objects/calibration-report.js";
import { renderCalibrationReport } from "../../../../../src/infrastructure/adapters/markdown/calibration-report-renderer.js";

const base: CalibrationReport = {
	generated_at: "2026-04-19T10:00:00.000Z",
	n_min: 5,
	implicit_weight: 0.5,
	decisions_scanned: 0,
	outcomes_scanned: 0,
	cells: [],
	recommendations: [],
	skipped_cells: [],
};

describe("renderCalibrationReport", () => {
	it("renders an empty report with summary header", () => {
		const md = renderCalibrationReport(base);
		expect(md).toContain("# Routing Calibration Report");
		expect(md).toContain("Generated at: 2026-04-19T10:00:00.000Z");
		expect(md).toContain("N_min: 5");
		expect(md).toContain("No cells evaluated");
	});

	it("renders cells and recommendations", () => {
		const md = renderCalibrationReport({
			...base,
			decisions_scanned: 3,
			outcomes_scanned: 5,
			cells: [
				{
					key: { kind: "agent", value: "tff-code-reviewer" },
					total: 6,
					effective_total: 5.5,
					effective_wrong: 3,
					verdict_breakdown: { ok: 2, wrong: 3, too_low: 1, too_high: 0 },
					sample_decision_ids: ["00000000-0000-4000-8000-000000000001"],
				},
			],
			recommendations: [
				{
					rule_id: "agent-wrong-rate-high",
					cell_key: { kind: "agent", value: "tff-code-reviewer" },
					severity: "strong",
					message: "review pool",
				},
			],
			skipped_cells: [
				{ key: { kind: "tag", value: "docs" }, total: 1, reason: "insufficient evidence" },
			],
		});
		expect(md).toContain("## Per-agent");
		expect(md).toContain("tff-code-reviewer");
		expect(md).toContain("## Recommendations");
		expect(md).toContain("agent-wrong-rate-high");
		expect(md).toContain("## Skipped cells");
		expect(md).toContain("docs");
	});

	it("is deterministic on identical input", () => {
		const md1 = renderCalibrationReport(base);
		const md2 = renderCalibrationReport(base);
		expect(md1).toEqual(md2);
	});

	it("emits a deprecation footer when implicit_weight_deprecated is true", () => {
		const md = renderCalibrationReport({
			...base,
			implicit_weight_deprecated: true,
			source_weights: { manual: 1.0, "debug-join": 0.4, "model-judge": 1.0 },
		});
		expect(md).toContain("Deprecation");
		expect(md).toContain("implicit_weight");
		expect(md).toContain("source_weights");
		expect(md).toContain("debug-join");
	});

	it("omits the deprecation footer when implicit_weight_deprecated is false/undefined", () => {
		const md = renderCalibrationReport(base);
		expect(md).not.toContain("Deprecation");
	});
});
