import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../../domain/errors/precondition-violation.error.js";
import type { OutcomeJudge } from "../../../domain/ports/outcome-judge.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import type { JudgeEvidence } from "../../../domain/value-objects/judge-evidence.js";
import {
	type JudgeVerdict,
	JudgeVerdictSchema,
} from "../../../domain/value-objects/judge-verdict.js";

const SYSTEM_PROMPT = `You are a senior engineer auditing routing decisions made by an automated agent-router.
Given a slice's spec, its merged diff, and the {agent, tier, signals} decisions the router made for that ship,
emit one "agent" verdict and one "tier" verdict per decision.

Agent verdicts: "ok" (agent was appropriate for this work) or "wrong" (different agent should have been chosen).
Tier verdicts: "ok", "wrong", "too-low" (work was harder than router thought), or "too-high" (work was simpler).

Base verdicts only on the evidence provided. Do not speculate about code or intent that is not visible.
If evidence is insufficient to judge a dimension, emit "ok".
Keep each "reason" under 500 characters and reference concrete evidence from the diff or spec.

Return verdicts by calling the record_verdicts tool. Do not reply in prose.`;

const userPromptFor = (evidence: JudgeEvidence): string => `Slice: ${evidence.slice_label}
Debug run happened after ship: ${evidence.debug_happened}

--- SPEC ---
${evidence.slice_spec}

--- DIFF SUMMARY ---
files=${evidence.diff_summary.files_changed} +${evidence.diff_summary.insertions}/-${evidence.diff_summary.deletions}
${evidence.diff_summary.patch}

--- DECISIONS ---
${JSON.stringify(evidence.decisions, null, 2)}`;

const TOOL_NAME = "record_verdicts";

const TOOL_SCHEMA = {
	type: "object" as const,
	required: ["verdicts"] as const,
	properties: {
		verdicts: {
			type: "array" as const,
			items: {
				type: "object" as const,
				required: ["decision_id", "dimension", "verdict", "reason"],
				properties: {
					decision_id: { type: "string" as const, format: "uuid" },
					dimension: { type: "string" as const, enum: ["agent", "tier"] },
					verdict: { type: "string" as const, enum: ["ok", "wrong", "too-low", "too-high"] },
					reason: { type: "string" as const, maxLength: 500 },
				},
			},
		},
	},
};

const ToolInputSchema = z.object({
	verdicts: z.array(JudgeVerdictSchema),
});

export interface HaikuOutcomeJudgeOpts {
	client: Anthropic;
	model: string;
	temperature: number;
	timeout_ms: number;
}

export class HaikuOutcomeJudge implements OutcomeJudge {
	constructor(private readonly opts: HaikuOutcomeJudgeOpts) {}

	async judge(evidence: JudgeEvidence): Promise<Result<JudgeVerdict[], DomainError>> {
		let response: unknown;
		try {
			response = await this.opts.client.messages.create(
				{
					model: this.opts.model,
					max_tokens: 4096,
					temperature: this.opts.temperature,
					system: SYSTEM_PROMPT,
					messages: [{ role: "user", content: userPromptFor(evidence) }],
					tools: [
						{
							name: TOOL_NAME,
							description: "Record agent and tier verdicts for each routing decision.",
							input_schema: TOOL_SCHEMA,
						},
					],
					tool_choice: { type: "tool", name: TOOL_NAME },
				} as never,
				{ timeout: this.opts.timeout_ms } as never,
			);
		} catch (err) {
			return Err(
				createDomainError("EXTERNAL_CALL_FAILED", "anthropic SDK call failed", {
					provider: "anthropic",
					error: err instanceof Error ? err.message : String(err),
				}),
			);
		}

		const r = response as {
			stop_reason?: string;
			content?: Array<{ type: string; name?: string; input?: unknown }>;
		};
		if (r.stop_reason !== "tool_use") {
			return Err(
				preconditionViolationError([
					{ code: "judge.stop_reason", expected: "tool_use", actual: r.stop_reason ?? "null" },
				]),
			);
		}

		const toolUse = (r.content ?? []).find((c) => c.type === "tool_use" && c.name === TOOL_NAME);
		if (!toolUse) {
			return Err(
				preconditionViolationError([
					{ code: "judge.tool_call", expected: TOOL_NAME, actual: "missing" },
				]),
			);
		}

		const parsed = ToolInputSchema.safeParse(toolUse.input);
		if (!parsed.success) {
			return Err(
				preconditionViolationError(
					parsed.error.issues.map((i) => ({
						code: i.path.join(".") || "judge.tool_input",
						expected: "valid JudgeVerdict",
						actual: i.message,
					})),
				),
			);
		}

		return Ok(parsed.data.verdicts);
	}
}
