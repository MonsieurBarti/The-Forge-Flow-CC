import { describe, expect, it } from "vitest";
import { judgeOutcomesUseCase } from "../../../../src/application/routing/judge-outcomes.js";
import type { DomainError } from "../../../../src/domain/errors/domain-error.js";
import type { DiffReader } from "../../../../src/domain/ports/diff-reader.port.js";
import type { OutcomeJudge } from "../../../../src/domain/ports/outcome-judge.port.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import type { SliceMergeLookup } from "../../../../src/domain/ports/slice-merge-lookup.port.js";
import type { SliceSpecReader } from "../../../../src/domain/ports/slice-spec-reader.port.js";
import { Err, isErr, isOk, Ok } from "../../../../src/domain/result.js";
import type { JudgeVerdict } from "../../../../src/domain/value-objects/judge-verdict.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const SLICE_ID = "00000000-0000-4000-8000-0000000000aa";
const D1 = "00000000-0000-4000-8000-000000000001";
const D2 = "00000000-0000-4000-8000-000000000002";
const MERGE = "abc1234567890abcdef1234567890abcdef1234";

type DebugEvent = { slice_id: string };

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
		debugEvents: DebugEvent[];
		specResult: { text: string; truncated: boolean; missing: boolean };
		diffResult: {
			files_changed: number;
			insertions: number;
			deletions: number;
			patch: string;
			truncated: boolean;
		};
		mergeResult: "found" | "missing";
		judgeVerdicts: JudgeVerdict[] | "error";
		modelJudgeEnabled: boolean;
	}>,
) => {
	const written: RoutingOutcome[] = [];
	const writer: OutcomeWriter = { append: async (o) => void written.push(o) };

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

	const judge: OutcomeJudge = {
		judge: async () =>
			overrides.judgeVerdicts === "error"
				? Err({ code: "EXTERNAL_CALL_FAILED", message: "api down" } as DomainError)
				: Ok(overrides.judgeVerdicts ?? []),
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
			writer,
			judge,
			mergeLookup,
			diffReader,
			specReader,
			maxPatchBytes: 32768,
			maxSpecBytes: 16384,
			uuid: () => "00000000-0000-4000-8000-000000000bbb",
			now: () => "2026-04-20T10:00:00.000Z",
			modelJudgeEnabled: overrides.modelJudgeEnabled ?? true,
		},
		written,
	};
};

describe("judgeOutcomesUseCase", () => {
	it("returns PRECONDITION_VIOLATION when slice is not closed", async () => {
		const { deps } = makeDeps({ sliceStatus: "executing" });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when model_judge is disabled", async () => {
		const { deps } = makeDeps({ modelJudgeEnabled: false });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
	});

	it("returns ok with outcomes_emitted=0 when no decisions for slice", async () => {
		const { deps, written } = makeDeps({ decisions: [] });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(0);
		expect(res.data.skipped).toBe(0);
		expect(written).toHaveLength(0);
	});

	it("skips when all decisions already judged", async () => {
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
		const { deps, written } = makeDeps({ existingOutcomes: [existing] });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(0);
		expect(res.data.skipped).toBe(1);
		expect(written).toHaveLength(0);
	});

	it("writes one agent + one tier outcome per un-judged decision", async () => {
		const { deps, written } = makeDeps({
			decisions: [
				{ decision_id: D1, agent: "reviewer", tier: "sonnet", slice_id: "M01-S02" },
				{ decision_id: D2, agent: "auditor", tier: "haiku", slice_id: "M01-S02" },
			],
			judgeVerdicts: [
				{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "r1" },
				{ decision_id: D1, dimension: "tier", verdict: "too-high", reason: "r2" },
				{ decision_id: D2, dimension: "agent", verdict: "wrong", reason: "r3" },
				{ decision_id: D2, dimension: "tier", verdict: "ok", reason: "r4" },
			],
		});
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(4);
		expect(written).toHaveLength(4);
		expect(written.every((o) => o.source === "model-judge")).toBe(true);
	});

	it("drops verdicts for unknown decision_ids, keeps the rest", async () => {
		const { deps, written } = makeDeps({
			decisions: [{ decision_id: D1, agent: "reviewer", tier: "sonnet", slice_id: "M01-S02" }],
			judgeVerdicts: [
				{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "r1" },
				{
					decision_id: "00000000-0000-4000-8000-00000000ffff",
					dimension: "agent",
					verdict: "ok",
					reason: "stray",
				},
			],
		});
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(1);
		expect(written).toHaveLength(1);
	});

	it("propagates OutcomeJudge error with no partial writes", async () => {
		const { deps, written } = makeDeps({ judgeVerdicts: "error" });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
		expect(written).toHaveLength(0);
	});

	it("returns PRECONDITION_VIOLATION when merge commit not found", async () => {
		const { deps } = makeDeps({ mergeResult: "missing" });
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(isErr(res)).toBe(true);
	});

	it("prefixes reason with [evidence_truncated] when diff or spec was truncated", async () => {
		const { deps, written } = makeDeps({
			diffResult: {
				files_changed: 5,
				insertions: 5000,
				deletions: 100,
				patch: "x",
				truncated: true,
			},
			judgeVerdicts: [{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "r1" }],
		});
		await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(written[0].reason?.startsWith("[evidence_truncated]")).toBe(true);
	});

	it("strips ASCII control characters from verdict reason before persisting", async () => {
		const { deps, written } = makeDeps({
			judgeVerdicts: [
				{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "looks\x1bfine\x07" },
			],
		});
		await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		expect(written[0].reason).not.toContain("\x1b");
		expect(written[0].reason).not.toContain("\x07");
		expect(written[0].reason).toContain("looks");
		expect(written[0].reason).toContain("fine");
	});

	it("sets spec_missing=true in result when SPEC.md is not found", async () => {
		const { deps } = makeDeps({
			specResult: { text: "", truncated: false, missing: true },
			judgeVerdicts: [{ decision_id: D1, dimension: "agent", verdict: "ok", reason: "r1" }],
		});
		const res = await judgeOutcomesUseCase({ slice_id: SLICE_ID }, deps);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.spec_missing).toBe(true);
	});
});
