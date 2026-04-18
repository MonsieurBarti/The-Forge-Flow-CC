import { describe, expect, it } from "vitest";
import { SignalsSchema } from "../../../../src/domain/value-objects/signals.js";

describe("SignalsSchema", () => {
	it("parses a minimal valid Signals object", () => {
		const parsed = SignalsSchema.parse({
			complexity: "low",
			risk: { level: "low", tags: [] },
		});
		expect(parsed.complexity).toBe("low");
		expect(parsed.risk.level).toBe("low");
		expect(parsed.risk.tags).toEqual([]);
	});

	it("accepts risk tags as strings", () => {
		const parsed = SignalsSchema.parse({
			complexity: "high",
			risk: { level: "high", tags: ["auth", "migrations"] },
		});
		expect(parsed.risk.tags).toEqual(["auth", "migrations"]);
	});

	it("rejects invalid complexity values", () => {
		expect(() =>
			SignalsSchema.parse({
				complexity: "extreme",
				risk: { level: "low", tags: [] },
			}),
		).toThrow();
	});

	it("rejects invalid risk levels", () => {
		expect(() =>
			SignalsSchema.parse({
				complexity: "low",
				risk: { level: "catastrophic", tags: [] },
			}),
		).toThrow();
	});
});
