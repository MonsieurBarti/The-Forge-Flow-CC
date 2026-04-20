import { describe, expect, it, vi } from "vitest";
import { isErr, isOk } from "../../../../../src/domain/result.js";
import type { JudgeEvidence } from "../../../../../src/domain/value-objects/judge-evidence.js";
import { HaikuOutcomeJudge } from "../../../../../src/infrastructure/adapters/anthropic/haiku-outcome-judge.js";

const evidence: JudgeEvidence = {
	slice_id: "M01-S02",
	slice_label: "M01-S02",
	slice_spec: "# spec",
	merge_commit: "abc1234",
	diff_summary: { files_changed: 1, insertions: 10, deletions: 0, patch: "diff..." },
	debug_happened: false,
	decisions: [
		{
			decision_id: "00000000-0000-4000-8000-000000000001",
			agent: "reviewer",
			tier: "sonnet",
			signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
			fallback_used: false,
			confidence: 0.9,
		},
	],
};

const makeClient = (impl: () => Promise<unknown>) => ({
	messages: { create: vi.fn(impl) },
});

describe("HaikuOutcomeJudge", () => {
	it("returns verdicts when the model invokes record_verdicts", async () => {
		const client = makeClient(async () => ({
			stop_reason: "tool_use",
			content: [
				{
					type: "tool_use",
					name: "record_verdicts",
					input: {
						verdicts: [
							{
								decision_id: "00000000-0000-4000-8000-000000000001",
								dimension: "agent",
								verdict: "ok",
								reason: "reviewer caught auth concern",
							},
							{
								decision_id: "00000000-0000-4000-8000-000000000001",
								dimension: "tier",
								verdict: "too-high",
								reason: "80 LOC of config",
							},
						],
					},
				},
			],
		}));
		const judge = new HaikuOutcomeJudge({
			client: client as never,
			model: "claude-haiku-4-5-20251001",
			temperature: 0,
			timeout_ms: 30000,
		});
		const res = await judge.judge(evidence);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data).toHaveLength(2);
		expect(res.data[0].dimension).toBe("agent");
	});

	it("errors when stop_reason is not tool_use", async () => {
		const client = makeClient(async () => ({
			stop_reason: "end_turn",
			content: [{ type: "text", text: "hello" }],
		}));
		const judge = new HaikuOutcomeJudge({
			client: client as never,
			model: "claude-haiku-4-5-20251001",
			temperature: 0,
			timeout_ms: 30000,
		});
		const res = await judge.judge(evidence);
		expect(isErr(res)).toBe(true);
	});

	it("errors when tool_use input fails JudgeVerdictSchema", async () => {
		const client = makeClient(async () => ({
			stop_reason: "tool_use",
			content: [
				{
					type: "tool_use",
					name: "record_verdicts",
					input: {
						verdicts: [
							{ decision_id: "not-a-uuid", dimension: "agent", verdict: "ok", reason: "r" },
						],
					},
				},
			],
		}));
		const judge = new HaikuOutcomeJudge({
			client: client as never,
			model: "claude-haiku-4-5-20251001",
			temperature: 0,
			timeout_ms: 30000,
		});
		const res = await judge.judge(evidence);
		expect(isErr(res)).toBe(true);
	});

	it("errors when the SDK throws", async () => {
		const client = makeClient(async () => {
			throw new Error("network fail");
		});
		const judge = new HaikuOutcomeJudge({
			client: client as never,
			model: "claude-haiku-4-5-20251001",
			temperature: 0,
			timeout_ms: 30000,
		});
		const res = await judge.judge(evidence);
		expect(isErr(res)).toBe(true);
	});
});
