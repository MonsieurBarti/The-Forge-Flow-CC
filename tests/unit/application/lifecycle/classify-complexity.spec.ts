import { describe, expect, it } from "vitest";
import { classifyComplexity } from "../../../../src/application/lifecycle/classify-complexity.js";

const base = {
	taskCount: 1,
	estimatedFilesAffected: 1,
	newFilesCreated: 0,
	modulesAffected: 1,
	hasExternalIntegrations: false,
	requiresInvestigation: false,
	architectureImpact: false,
	unknownsSurfaced: 0,
	riskLevel: "low" as const,
};

describe("classifyComplexity", () => {
	it("should classify as S only when single-file, no new files, no investigation, no unknowns, low risk", () => {
		expect(classifyComplexity(base)).toBe("S");
	});

	it("should classify as SS when multiple files affected", () => {
		expect(classifyComplexity({ ...base, estimatedFilesAffected: 2 })).toBe("SS");
	});

	it("should classify as SS when new files are created", () => {
		expect(classifyComplexity({ ...base, newFilesCreated: 1 })).toBe("SS");
	});

	it("should classify as SS when investigation is required", () => {
		expect(classifyComplexity({ ...base, requiresInvestigation: true })).toBe("SS");
	});

	it("should classify as SS when architecture impact exists", () => {
		expect(classifyComplexity({ ...base, architectureImpact: true })).toBe("SS");
	});

	it("should classify as SS when unknowns are surfaced", () => {
		expect(classifyComplexity({ ...base, unknownsSurfaced: 1 })).toBe("SS");
	});

	it("should classify as SSS for high risk regardless of file count", () => {
		expect(classifyComplexity({ ...base, riskLevel: "high" })).toBe("SSS");
	});

	it("should classify as SSS for high risk even with single file", () => {
		expect(classifyComplexity({ ...base, estimatedFilesAffected: 1, riskLevel: "high" })).toBe(
			"SSS",
		);
	});

	it("should classify as SS minimum for medium risk", () => {
		expect(classifyComplexity({ ...base, riskLevel: "medium" })).toBe("SS");
	});

	it("should classify as SS for medium risk even when S-tier criteria met", () => {
		expect(classifyComplexity({ ...base, riskLevel: "medium" })).toBe("SS");
	});

	it("should classify as SSS for external integrations regardless of size", () => {
		expect(classifyComplexity({ ...base, hasExternalIntegrations: true })).toBe("SSS");
	});

	it("should classify as SSS for large task count", () => {
		expect(classifyComplexity({ ...base, taskCount: 8 })).toBe("SSS");
	});

	it("should classify as SSS for many modules", () => {
		expect(classifyComplexity({ ...base, modulesAffected: 4 })).toBe("SSS");
	});

	it("should default to SS for moderate scope", () => {
		expect(
			classifyComplexity({
				taskCount: 5,
				estimatedFilesAffected: 8,
				newFilesCreated: 2,
				modulesAffected: 2,
				hasExternalIntegrations: false,
				requiresInvestigation: true,
				architectureImpact: false,
				unknownsSurfaced: 1,
				riskLevel: "low",
			}),
		).toBe("SS");
	});
});
