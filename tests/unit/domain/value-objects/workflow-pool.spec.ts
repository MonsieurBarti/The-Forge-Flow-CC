import { describe, expect, it } from "vitest";
import { WorkflowPoolSchema } from "../../../../src/domain/value-objects/workflow-pool.js";

describe("WorkflowPoolSchema", () => {
	it("parses a valid pool", () => {
		const parsed = WorkflowPoolSchema.parse({
			workflow_id: "tff:ship",
			agents: [
				{ id: "tff-code-reviewer", handles: ["standard_review"], priority: 10 },
				{
					id: "tff-security-auditor",
					handles: ["high_risk", "auth"],
					priority: 20,
				},
			],
			default_agent: "tff-code-reviewer",
		});
		expect(parsed.workflow_id).toBe("tff:ship");
		expect(parsed.agents).toHaveLength(2);
		expect(parsed.default_agent).toBe("tff-code-reviewer");
	});

	it("rejects a pool with no agents", () => {
		expect(() =>
			WorkflowPoolSchema.parse({
				workflow_id: "tff:ship",
				agents: [],
				default_agent: "x",
			}),
		).toThrow();
	});

	it("rejects when default_agent is not in the pool", () => {
		expect(() =>
			WorkflowPoolSchema.parse({
				workflow_id: "tff:ship",
				agents: [{ id: "a", handles: [], priority: 0 }],
				default_agent: "not-in-pool",
			}),
		).toThrow(/default_agent/);
	});
});
