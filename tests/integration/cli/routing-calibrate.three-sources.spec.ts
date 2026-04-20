import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routingCalibrateCmd } from "../../../src/cli/commands/routing-calibrate.cmd.js";

const SLICE = "M01-S02";
const D1 = "00000000-0000-4000-8000-000000000001";

const seed = (root: string) => {
	mkdirSync(join(root, ".tff-cc", "logs"), { recursive: true });
	writeFileSync(
		join(root, ".tff-cc", "settings.yaml"),
		`routing:
  enabled: true
  calibration:
    n_min: 2
    source_weights:
      manual: 1.0
      debug-join: 0.5
      model-judge: 1.0
`,
	);
	writeFileSync(
		join(root, ".tff-cc", "logs", "routing.jsonl"),
		`${JSON.stringify({
			kind: "route",
			timestamp: "2026-04-20T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: SLICE,
			decision: {
				agent: "reviewer",
				confidence: 0.9,
				signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
				fallback_used: false,
				enriched: false,
				decision_id: D1,
			},
		})}
`,
	);
	const mkOutcome = (id: string, source: "manual" | "debug-join" | "model-judge") => ({
		outcome_id: id,
		decision_id: D1,
		dimension: source === "debug-join" ? "unknown" : "tier",
		verdict: source === "debug-join" ? "wrong" : "too-high",
		source,
		slice_id: SLICE,
		workflow_id: "tff:ship",
		emitted_at: "2026-04-20T10:00:00.000Z",
	});
	writeFileSync(
		join(root, ".tff-cc", "logs", "routing-outcomes.jsonl"),
		`${[
			JSON.stringify(mkOutcome("00000000-0000-4000-8000-0000000000a1", "manual")),
			JSON.stringify(mkOutcome("00000000-0000-4000-8000-0000000000a2", "debug-join")),
			JSON.stringify(mkOutcome("00000000-0000-4000-8000-0000000000a3", "model-judge")),
		].join("\n")}
`,
	);
};

describe("routing:calibrate — three sources", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-cal-"));
		vi.spyOn(process, "cwd").mockReturnValue(root);
	});

	it("aggregates manual + debug-join + model-judge with source_weights", async () => {
		seed(root);
		const out = await routingCalibrateCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);

		const reportPath = join(root, ".tff-cc", "logs", "routing-calibration.md");
		const md = readFileSync(reportPath, "utf8");
		expect(md).toContain("reviewer");
		// effective_total on the reviewer agent cell:
		// 1.0 (manual) + 0.5 (debug-join) + 1.0 (model-judge) = 2.5 ≥ n_min=2 → cell passes the gate
		expect(md).not.toContain("reviewer) — insufficient evidence");
		// source_weights only — no implicit_weight in settings → no deprecation footer
		expect(md).not.toContain("Deprecation");
	});

	it("emits a deprecation footer when only implicit_weight is configured", async () => {
		mkdirSync(join(root, ".tff-cc", "logs"), { recursive: true });
		writeFileSync(
			join(root, ".tff-cc", "settings.yaml"),
			`routing:
  enabled: true
  calibration:
    n_min: 2
    implicit_weight: 0.4
`,
		);
		writeFileSync(join(root, ".tff-cc", "logs", "routing.jsonl"), "");
		const out = await routingCalibrateCmd([]);
		expect(JSON.parse(out).ok).toBe(true);
		const md = readFileSync(join(root, ".tff-cc", "logs", "routing-calibration.md"), "utf8");
		expect(md).toContain("Deprecation");
		expect(md).toContain("implicit_weight");
	});
});
