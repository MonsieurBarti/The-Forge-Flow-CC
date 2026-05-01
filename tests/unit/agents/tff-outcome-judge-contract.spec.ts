import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JudgeVerdictSchema } from "../../../src/domain/value-objects/judge-verdict.js";

const agentDoc = readFileSync(join(process.cwd(), "agents", "tff-outcome-judge.md"), "utf8");
const shipDoc = readFileSync(join(process.cwd(), "workflows", "ship-slice.md"), "utf8");

describe("tff-outcome-judge agent contract", () => {
	it("output schema example matches JudgeVerdictSchema after placeholder substitution", () => {
		expect(agentDoc).toContain('"verdicts"');
		expect(agentDoc).toContain('"decision_id"');
		expect(agentDoc).toContain('"dimension"');
		expect(agentDoc).toContain('"verdict"');
		expect(agentDoc).toContain('"reason"');

		const sample = {
			decision_id: "00000000-0000-4000-8000-000000000001",
			dimension: "agent" as const,
			verdict: "ok" as const,
			reason: "patch is small and matches reviewer scope",
		};
		expect(JudgeVerdictSchema.safeParse(sample).success).toBe(true);
		expect(
			JudgeVerdictSchema.safeParse({ ...sample, dimension: "tier", verdict: "too-high" }).success,
		).toBe(true);
	});

	it("declares its schema authoritative (override conflicting orchestrator prompts)", () => {
		expect(agentDoc.toLowerCase()).toContain("authoritative");
		expect(agentDoc).toMatch(/ignore (it|any conflicting)/i);
	});

	it("requires the wrapped envelope shape, not a bare array", () => {
		expect(agentDoc).toMatch(/never a bare array/i);
	});
});

describe("ship-slice DRAIN block — judge prompt", () => {
	it("references the agent by id and does NOT inline a custom verdict schema", () => {
		const drainSection = shipDoc.split("DRAIN routing judgment")[1] ?? "";
		expect(drainSection).toContain("tff-outcome-judge");

		// Must not inline a wrong/incomplete schema (the bug from issue #166).
		// The JSON schema lives in the agent definition only.
		expect(drainSection).not.toMatch(/"appropriate"|"under-tiered"|"over-tiered"/);
		expect(drainSection).not.toMatch(/agent dimension|tier dimension/i);
		// Drain block should defer schema authority to the agent, not redefine it.
		expect(drainSection).toMatch(/agent['’]s (own )?(definition|instructions)/i);
	});

	it("provides the canonical Evidence/Verdicts path prompt template", () => {
		const drainSection = shipDoc.split("DRAIN routing judgment")[1] ?? "";
		expect(drainSection).toContain("Evidence path:");
		expect(drainSection).toContain("Verdicts path:");
	});
});
