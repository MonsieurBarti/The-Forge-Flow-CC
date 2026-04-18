import { describe, expect, it } from "vitest";
import { AgentCapabilitySchema } from "../../../../src/domain/value-objects/agent-capability.js";

describe("AgentCapabilitySchema", () => {
	it("parses a valid capability", () => {
		const parsed = AgentCapabilitySchema.parse({
			id: "tff-security-auditor",
			handles: ["high_risk", "auth", "migrations"],
			priority: 20,
		});
		expect(parsed.id).toBe("tff-security-auditor");
		expect(parsed.handles).toHaveLength(3);
		expect(parsed.priority).toBe(20);
	});

	it("accepts empty handles array", () => {
		const parsed = AgentCapabilitySchema.parse({
			id: "tff-fixer",
			handles: [],
			priority: 0,
		});
		expect(parsed.handles).toEqual([]);
	});

	it("rejects missing id", () => {
		expect(() => AgentCapabilitySchema.parse({ handles: [], priority: 0 })).toThrow();
	});

	it("rejects non-string handles", () => {
		expect(() =>
			AgentCapabilitySchema.parse({
				id: "x",
				handles: [42],
				priority: 0,
			}),
		).toThrow();
	});
});
