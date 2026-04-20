import { describe, expect, it } from "vitest";
import { prepareJudgeEvidenceUseCase } from "../../../../src/application/routing/prepare-judge-evidence.js";
import type { DomainError } from "../../../../src/domain/errors/domain-error.js";
import type { DiffReader } from "../../../../src/domain/ports/diff-reader.port.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { SliceMergeLookup } from "../../../../src/domain/ports/slice-merge-lookup.port.js";
import type { SliceSpecReader } from "../../../../src/domain/ports/slice-spec-reader.port.js";
import { Err, isErr, isOk, Ok } from "../../../../src/domain/result.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const SLICE_ID = "00000000-0000-4000-8000-0000000000aa";
const D1 = "00000000-0000-4000-8000-000000000001";
const D2 = "00000000-0000-4000-8000-000000000002";
const MERGE = "abc1234567890abcdef1234567890abcdef1234";

const makeDeps = (
	overrides: Partial<{
		sliceStatus: "closed" | "executing";
		sliceLabel: string;
		decisions: {
			decision_id: string;
			agent: string;
			tier: "haiku" | "sonnet" | "opus";
			slice_id: string;
		}[];
		existingOutcomes: RoutingOutcome[];
		debugEvents: { slice_id: string }[];
		specResult: { text: string; truncated: boolean; missing: boolean };
		diffResult: {
			files_changed: number;
			insertions: number;
			deletions: number;
			patch: string;
			truncated: boolean;
		};
		mergeResult: "found" | "missing";
		modelJudgeEnabled: boolean;
	}>,
) => {
	const existingOutcomes = overrides.existingOutcomes ?? [];
	const outcomesSource: OutcomeSource = {
		async *readOutcomes() {
			for (const o of existingOutcomes) yield o;
		},
	};

	const mergeLookup: SliceMergeLookup = {
		findMergeCommit: async () =>
			overrides.mergeResult === "missing"
				? Err({ code: "PRECONDITION_VIOLATION", message: "no merge" } as DomainError)
				: Ok(MERGE),
	};

	const diffReader: DiffReader = {
		readMergeDiff: async () =>
			Ok(
				overrides.diffResult ?? {
					files_changed: 2,
					insertions: 40,
					deletions: 5,
					patch: "diff...",
					truncated: false,
				},
			),
	};

	const specReader: SliceSpecReader = {
		readSpec: async () =>
			Ok(overrides.specResult ?? { text: "# spec", truncated: false, missing: false }),
	};

	return {
		deps: {
			sliceStatus: overrides.sliceStatus ?? "closed",
			sliceLabel: overrides.sliceLabel ?? "M01-S02",
			decisions: overrides.decisions ?? [
				{ decision_id: D1, agent: "reviewer", tier: "sonnet" as const, slice_id: "M01-S02" },
			],
			debugEvents: overrides.debugEvents ?? [],
			outcomesSource,
			mergeLookup,
			diffReader,
			specReader,
			maxPatchBytes: 32768,
			maxSpecBytes: 16384,
			modelJudgeEnabled: overrides.modelJudgeEnabled ?? true,
		},
	};
};

describe("prepareJudgeEvidenceUseCase", () => {
	it("returns PRECONDITION_VIOLATION when model_judge is disabled", async () => {
		const { deps } = makeDeps({ modelJudgeEnabled: false });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when slice is not closed", async () => {
		const { deps } = makeDeps({ sliceStatus: "executing" });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns evidence null when no decisions", async () => {
		const { deps } = makeDeps({ decisions: [] });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.evidence).toBeNull();
		expect(res.data.unjudged_decision_ids).toHaveLength(0);
		expect(res.data.skipped).toBe(0);
	});

	it("returns evidence null with skipped count when all decisions already judged", async () => {
		const existing: RoutingOutcome = {
			outcome_id: "00000000-0000-4000-8000-000000000aaa",
			decision_id: D1,
			dimension: "tier",
			verdict: "ok",
			source: "model-judge",
			slice_id: "M01-S02",
			workflow_id: "tff:ship",
			emitted_at: "2026-04-20T09:00:00.000Z",
		};
		const { deps } = makeDeps({ existingOutcomes: [existing] });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.evidence).toBeNull();
		expect(res.data.skipped).toBe(1);
		expect(res.data.model_judge_already_had).toBe(1);
	});

	it("happy path emits full evidence with real tier from deps", async () => {
		const { deps } = makeDeps({
			decisions: [
				{ decision_id: D1, agent: "reviewer", tier: "opus", slice_id: "M01-S02" },
				{ decision_id: D2, agent: "auditor", tier: "haiku", slice_id: "M01-S02" },
			],
		});
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		const { evidence } = res.data;
		expect(evidence).not.toBeNull();
		if (!evidence) throw new Error("evidence is null");
		expect(evidence.decisions).toHaveLength(2);
		expect(evidence.decisions[0].tier).toBe("opus");
		expect(evidence.decisions[1].tier).toBe("haiku");
		expect(evidence.merge_commit).toBe(MERGE);
		expect(res.data.unjudged_decision_ids).toEqual([D1, D2]);
		expect(res.data.skipped).toBe(0);
	});

	it("propagates merge-lookup error", async () => {
		const { deps } = makeDeps({ mergeResult: "missing" });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
	});

	it("surfaces spec_missing flag when SPEC.md is absent", async () => {
		const { deps } = makeDeps({
			specResult: { text: "", truncated: false, missing: true },
		});
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.spec_missing).toBe(true);
		expect(res.data.evidence).not.toBeNull();
	});

	it("sets debug_happened true when debugEvents is non-empty", async () => {
		const { deps } = makeDeps({
			debugEvents: [{ slice_id: "M01-S02" }],
		});
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.evidence?.debug_happened).toBe(true);
	});

	it("sets debug_happened false when debugEvents is empty", async () => {
		const { deps } = makeDeps({ debugEvents: [] });
		const res = await prepareJudgeEvidenceUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.evidence?.debug_happened).toBe(false);
	});
});
