import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routingJudgePrepareCmd } from "../../../src/cli/commands/routing-judge-prepare.cmd.js";

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
		data: { files_changed: 2, insertions: 10, deletions: 3, patch: "diff...", truncated: false },
	}),
};
const stubSpecReader = {
	readSpec: async () => ({
		ok: true as const,
		data: { text: "# spec", truncated: false, missing: false },
	}),
};
const stubMergeLookup = {
	findMergeCommit: async (_label: string, _branches: string[]) => ({
		ok: true as const,
		data: "abc1234567890",
	}),
};

describe("routing:judge-prepare — roundtrip", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-prepare-"));
		vi.spyOn(process, "cwd").mockReturnValue(root);
	});

	it("happy path: returns evidence with decisions having real tier (opus)", async () => {
		seed(root);
		const out = await routingJudgePrepareCmd(["--slice", SLICE], {
			mergeLookupFactory: () => stubMergeLookup,
			diffReaderFactory: () => stubDiffReader,
			specReaderFactory: () => stubSpecReader,
			sliceStatusLookup: async () => "closed",
			sliceLabelLookup: async () => SLICE,
		});
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		const { evidence, spec_missing } = parsed.data;
		expect(evidence).not.toBeNull();
		expect(spec_missing).toBe(false);
		// The joined tier from the tier event should be "opus"
		const tierDecision = evidence.decisions.find((d: { tier: string }) => d.tier === "opus");
		expect(tierDecision).toBeDefined();
	});

	it("slice not closed → PRECONDITION_VIOLATION", async () => {
		seed(root);
		const out = await routingJudgePrepareCmd(["--slice", SLICE], {
			mergeLookupFactory: () => stubMergeLookup,
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
