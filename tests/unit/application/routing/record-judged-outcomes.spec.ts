import { describe, expect, it } from "vitest";
import { recordJudgedOutcomesUseCase } from "../../../../src/application/routing/record-judged-outcomes.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import { isErr, isOk } from "../../../../src/domain/result.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const SLICE_ID = "00000000-0000-4000-8000-0000000000aa";
const D1 = "00000000-0000-4000-8000-000000000001";
const D2 = "00000000-0000-4000-8000-000000000002";

const makeVerdict = (
	decision_id: string,
	overrides?: Partial<{ dimension: string; verdict: string; reason: string }>,
) => ({
	decision_id,
	dimension: overrides?.dimension ?? "agent",
	verdict: overrides?.verdict ?? "ok",
	reason: overrides?.reason ?? "looks good",
});

const makeDeps = (
	overrides: Partial<{
		sliceStatus: string;
		decisions: { decision_id: string; slice_id: string; workflow_id?: string }[];
		existingOutcomes: RoutingOutcome[];
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

	return {
		deps: {
			sliceStatus: overrides.sliceStatus ?? "closed",
			decisions: overrides.decisions ?? [
				{ decision_id: D1, slice_id: "M01-S02", workflow_id: "tff:ship" },
			],
			outcomesSource,
			writer,
			modelJudgeEnabled: overrides.modelJudgeEnabled ?? true,
			uuid: () => "00000000-0000-4000-8000-000000000bbb",
			now: () => "2026-04-20T10:00:00.000Z",
		},
		written,
	};
};

describe("recordJudgedOutcomesUseCase", () => {
	it("returns PRECONDITION_VIOLATION when model_judge is disabled", async () => {
		const { deps } = makeDeps({ modelJudgeEnabled: false });
		const res = await recordJudgedOutcomesUseCase(
			{ slice_id: SLICE_ID, verdicts: { verdicts: [] }, evidence_truncated: false },
			deps,
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when slice is not closed", async () => {
		const { deps } = makeDeps({ sliceStatus: "executing" });
		const res = await recordJudgedOutcomesUseCase(
			{ slice_id: SLICE_ID, verdicts: { verdicts: [] }, evidence_truncated: false },
			deps,
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when verdicts envelope is malformed (not an object with verdicts array)", async () => {
		const { deps } = makeDeps({});
		const res = await recordJudgedOutcomesUseCase(
			{ slice_id: SLICE_ID, verdicts: { notVerdicts: [] }, evidence_truncated: false },
			deps,
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when a verdict has a bad UUID", async () => {
		const { deps } = makeDeps({});
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: {
					verdicts: [{ decision_id: "not-a-uuid", dimension: "agent", verdict: "ok", reason: "r" }],
				},
				evidence_truncated: false,
			},
			deps,
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns PRECONDITION_VIOLATION when verdict has a bad dimension×verdict combo (agent + too-high)", async () => {
		const { deps } = makeDeps({});
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: {
					verdicts: [{ decision_id: D1, dimension: "agent", verdict: "too-high", reason: "r" }],
				},
				evidence_truncated: false,
			},
			deps,
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("drops verdict for unknown decision_id silently", async () => {
		const { deps, written } = makeDeps({});
		const unknownId = "00000000-0000-4000-8000-0000000099ff";
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: { verdicts: [makeVerdict(unknownId)] },
				evidence_truncated: false,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(0);
		expect(written).toHaveLength(0);
	});

	it("skips verdict for already-judged decision", async () => {
		const existing: RoutingOutcome = {
			outcome_id: "00000000-0000-4000-8000-000000000aaa",
			decision_id: D1,
			dimension: "agent",
			verdict: "ok",
			source: "model-judge",
			slice_id: "M01-S02",
			workflow_id: "tff:ship",
			emitted_at: "2026-04-20T09:00:00.000Z",
		};
		const { deps, written } = makeDeps({ existingOutcomes: [existing] });
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: { verdicts: [makeVerdict(D1)] },
				evidence_truncated: false,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(0);
		expect(written).toHaveLength(0);
	});

	it("happy path writes N outcomes with source model-judge and sanitized reason", async () => {
		const { deps, written } = makeDeps({
			decisions: [
				{ decision_id: D1, slice_id: "M01-S02", workflow_id: "tff:ship" },
				{ decision_id: D2, slice_id: "M01-S02", workflow_id: "tff:ship" },
			],
		});
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: {
					verdicts: [
						makeVerdict(D1, { reason: "looks\x1bgood" }),
						makeVerdict(D2, { dimension: "tier", verdict: "too-high", reason: "overspec" }),
					],
				},
				evidence_truncated: false,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcomes_emitted).toBe(2);
		expect(written).toHaveLength(2);
		expect(written.every((o) => o.source === "model-judge")).toBe(true);
		// Reason should be sanitized: no ESC character
		expect(written[0].reason).not.toContain("\x1b");
		expect(written[0].reason).toContain("looks");
	});

	it("adds [evidence_truncated] prefix when evidence_truncated is true", async () => {
		const { deps, written } = makeDeps({});
		const res = await recordJudgedOutcomesUseCase(
			{
				slice_id: SLICE_ID,
				verdicts: { verdicts: [makeVerdict(D1, { reason: "fine" })] },
				evidence_truncated: true,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(written[0].reason).toMatch(/^\[evidence_truncated\] /);
	});
});
