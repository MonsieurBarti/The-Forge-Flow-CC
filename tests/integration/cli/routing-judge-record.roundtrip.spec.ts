import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routingJudgeRecordCmd } from "../../../src/cli/commands/routing-judge-record.cmd.js";

const SLICE = "M01-S02";
const D1 = "00000000-0000-4000-8000-000000000001";

const seed = (root: string) => {
	mkdirSync(join(root, ".tff-cc", "logs"), { recursive: true });
	mkdirSync(join(root, ".tff-cc", "milestones", "M01", "S02-auth"), { recursive: true });
	writeFileSync(
		join(root, ".tff-cc", "settings.yaml"),
		`routing:
  enabled: true
  calibration:
    model_judge:
      enabled: true
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
				signals: { complexity: "medium", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: D1,
			},
		})}\n`,
	);
};

describe("routing:judge-record — roundtrip", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-record-"));
		vi.spyOn(process, "cwd").mockReturnValue(root);
	});

	it("happy path: writes a model-judge outcome from verdicts file", async () => {
		seed(root);
		const verdictsPath = join(root, "verdicts.json");
		writeFileSync(
			verdictsPath,
			JSON.stringify({
				verdicts: [{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "looks good" }],
			}),
		);

		const out = await routingJudgeRecordCmd(["--slice", SLICE, "--verdicts-path", verdictsPath], {
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.outcomes_emitted).toBe(1);

		const lines = readFileSync(join(root, ".tff-cc", "logs", "routing-outcomes.jsonl"), "utf8")
			.trim()
			.split("\n")
			.filter(Boolean);
		expect(lines).toHaveLength(1);
		const outcome = JSON.parse(lines[0]);
		expect(outcome.source).toBe("model-judge");
		expect(outcome.dimension).toBe("agent");
		expect(outcome.verdict).toBe("ok");
		expect(outcome.reason).toBe("looks good");
	});

	it("clears pending judgment marker on success", async () => {
		seed(root);
		const verdictsPath = join(root, "verdicts.json");
		writeFileSync(
			verdictsPath,
			JSON.stringify({
				verdicts: [{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "looks good" }],
			}),
		);
		const cleared: string[] = [];
		const out = await routingJudgeRecordCmd(["--slice", SLICE, "--verdicts-path", verdictsPath], {
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
			clearPendingJudgment: (id) => cleared.push(id),
		});
		expect(JSON.parse(out).ok).toBe(true);
		expect(cleared).toEqual([SLICE]);
	});

	it("does not clear pending judgment marker on failure", async () => {
		seed(root);
		const verdictsPath = join(root, "bad.json");
		writeFileSync(verdictsPath, JSON.stringify({ notVerdicts: [] }));
		const cleared: string[] = [];
		const out = await routingJudgeRecordCmd(["--slice", SLICE, "--verdicts-path", verdictsPath], {
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
			clearPendingJudgment: (id) => cleared.push(id),
		});
		expect(JSON.parse(out).ok).toBe(false);
		expect(cleared).toEqual([]);
	});

	it("invalid verdicts envelope (missing verdicts key) → PRECONDITION_VIOLATION", async () => {
		seed(root);
		const verdictsPath = join(root, "bad-verdicts.json");
		writeFileSync(verdictsPath, JSON.stringify({ notVerdicts: [] }));

		const out = await routingJudgeRecordCmd(["--slice", SLICE, "--verdicts-path", verdictsPath], {
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("PRECONDITION_VIOLATION");
	});
});
