import { describe, expect, it } from "vitest";
import { JudgeVerdictSchema } from "../../../../src/domain/value-objects/judge-verdict.js";

const base = {
	decision_id: "00000000-0000-4000-8000-000000000001",
	reason: "patch is 80 LOC of config",
};

describe("JudgeVerdictSchema", () => {
	it("accepts agent + ok", () => {
		expect(
			JudgeVerdictSchema.safeParse({ ...base, dimension: "agent", verdict: "ok" }).success,
		).toBe(true);
	});

	it("accepts tier + too-high", () => {
		expect(
			JudgeVerdictSchema.safeParse({ ...base, dimension: "tier", verdict: "too-high" }).success,
		).toBe(true);
	});

	it("rejects dimension=unknown (reserved for debug-join)", () => {
		expect(
			JudgeVerdictSchema.safeParse({ ...base, dimension: "unknown", verdict: "wrong" }).success,
		).toBe(false);
	});

	it("rejects agent + too-low", () => {
		expect(
			JudgeVerdictSchema.safeParse({ ...base, dimension: "agent", verdict: "too-low" }).success,
		).toBe(false);
	});

	it("rejects reason over 500 chars", () => {
		expect(
			JudgeVerdictSchema.safeParse({
				...base,
				dimension: "agent",
				verdict: "ok",
				reason: "x".repeat(501),
			}).success,
		).toBe(false);
	});

	it("rejects non-uuid decision_id", () => {
		expect(
			JudgeVerdictSchema.safeParse({
				...base,
				decision_id: "not-a-uuid",
				dimension: "agent",
				verdict: "ok",
			}).success,
		).toBe(false);
	});
});
