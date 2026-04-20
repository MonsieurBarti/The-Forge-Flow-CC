import { describe, expect, it } from "vitest";
import { JudgeEvidenceSchema } from "../../../../src/domain/value-objects/judge-evidence.js";

const validDecision = {
	decision_id: "00000000-0000-4000-8000-000000000001",
	agent: "code-reviewer",
	tier: "sonnet" as const,
	signals: {
		complexity: "medium" as const,
		risk: { level: "medium" as const, tags: ["auth"] },
	},
	fallback_used: false,
	confidence: 0.8,
};

const base = {
	slice_id: "00000000-0000-4000-8000-0000000000aa",
	slice_label: "M01-S02",
	slice_spec: "# SPEC\nauth flow",
	merge_commit: "abc1234567890abcdef1234567890abcdef1234",
	diff_summary: {
		files_changed: 3,
		insertions: 42,
		deletions: 10,
		patch: "diff --git a/x b/x\n@@...",
	},
	debug_happened: false,
	decisions: [validDecision],
};

describe("JudgeEvidenceSchema", () => {
	it("accepts a valid evidence bundle", () => {
		expect(JudgeEvidenceSchema.safeParse(base).success).toBe(true);
	});

	it("rejects empty decisions array", () => {
		expect(JudgeEvidenceSchema.safeParse({ ...base, decisions: [] }).success).toBe(false);
	});

	it("rejects non-hex merge_commit", () => {
		expect(JudgeEvidenceSchema.safeParse({ ...base, merge_commit: "not-hex" }).success).toBe(false);
	});

	it("rejects tier outside haiku|sonnet|opus", () => {
		const bad = { ...validDecision, tier: "gpt" as unknown as "sonnet" };
		expect(JudgeEvidenceSchema.safeParse({ ...base, decisions: [bad] }).success).toBe(false);
	});

	it("accepts 7-char merge commit (short SHA)", () => {
		expect(JudgeEvidenceSchema.safeParse({ ...base, merge_commit: "abc1234" }).success).toBe(true);
	});
});
