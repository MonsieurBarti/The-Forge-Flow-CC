import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routingJudgeCmd } from "../../../src/cli/commands/routing-judge.cmd.js";

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
				signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
				fallback_used: false,
				enriched: false,
				decision_id: D1,
			},
		})}\n${JSON.stringify({
			kind: "tier",
			timestamp: "2026-04-20T09:00:01.000Z",
			workflow_id: "tff:ship",
			slice_id: SLICE,
			decision: {
				decision_id: "00000000-0000-4000-8000-000000000002",
				agent_id: "reviewer",
				tier: "opus",
				policy_tier: "opus",
				min_tier_applied: false,
				signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
			},
		})}\n`,
	);
	writeFileSync(join(root, ".tff-cc", "milestones", "M01", "S02-auth", "SPEC.md"), "# spec");
};

const stubDiffReader = {
	readMergeDiff: async () => ({
		ok: true as const,
		data: { files_changed: 0, insertions: 0, deletions: 0, patch: "", truncated: false },
	}),
};
const stubSpecReader = {
	readSpec: async () => ({
		ok: true as const,
		data: { text: "", truncated: false, missing: false },
	}),
};

describe("routing:judge — roundtrip", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-cli-"));
		vi.spyOn(process, "cwd").mockReturnValue(root);
	});

	it("writes a model-judge outcome for a closed slice", async () => {
		seed(root);
		const judgeSpy = vi.fn().mockResolvedValue({
			ok: true as const,
			data: [
				{ decision_id: D1, dimension: "agent" as const, verdict: "ok" as const, reason: "fine" },
				{
					decision_id: D1,
					dimension: "tier" as const,
					verdict: "too-high" as const,
					reason: "overkill",
				},
			],
		});
		const fakeJudge = { judge: judgeSpy };
		const fakeLookup = {
			findMergeCommit: async () => ({ ok: true as const, data: "abc1234567890" }),
		};
		const out = await routingJudgeCmd(["--slice", SLICE], {
			judgeFactory: () => fakeJudge,
			mergeLookupFactory: () => fakeLookup,
			diffReaderFactory: () => stubDiffReader,
			specReaderFactory: () => stubSpecReader,
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.outcomes_emitted).toBe(2);

		const lines = readFileSync(join(root, ".tff-cc", "logs", "routing-outcomes.jsonl"), "utf8")
			.trim()
			.split("\n")
			.filter(Boolean);
		expect(lines).toHaveLength(2);
		const objs = lines.map((l) => JSON.parse(l));
		expect(objs.some((o) => o.dimension === "agent")).toBe(true);
		expect(objs.some((o) => o.dimension === "tier")).toBe(true);
		expect(objs.every((o) => o.source === "model-judge")).toBe(true);

		// Verify the join worked: the judge received decisions[0].tier === "opus"
		expect(judgeSpy).toHaveBeenCalledOnce();
		const callArg = judgeSpy.mock.calls[0][0] as { decisions: Array<{ tier: string }> };
		expect(callArg.decisions[0].tier).toBe("opus");
	});

	it("refuses when slice is not closed", async () => {
		seed(root);
		const out = await routingJudgeCmd(["--slice", SLICE], {
			judgeFactory: () => ({ judge: async () => ({ ok: true, data: [] }) }),
			mergeLookupFactory: () => ({ findMergeCommit: async () => ({ ok: true, data: "abc1234" }) }),
			diffReaderFactory: () => stubDiffReader,
			specReaderFactory: () => stubSpecReader,
			sliceStatusLookup: async () => "executing",
			sliceLabelLookup: async () => SLICE,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("PRECONDITION_VIOLATION");
	});
});
