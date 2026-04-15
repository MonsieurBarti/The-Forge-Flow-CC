import { describe, expect, it } from "vitest";
import { BranchMismatchError } from "../../../src/infrastructure/testing/branch-mismatch.error.js";

describe("BranchMismatchError", () => {
	it("is instanceof Error", () => {
		const err = new BranchMismatchError("old-branch", "new-branch");
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(BranchMismatchError);
	});

	it("exposes expectedBranch and currentBranch", () => {
		const err = new BranchMismatchError("milestone/M01", "slice/M01-S05");
		expect(err.expectedBranch).toBe("milestone/M01");
		expect(err.currentBranch).toBe("slice/M01-S05");
	});

	it("exposes stampPath with default value", () => {
		const err = new BranchMismatchError("a", "b");
		expect(err.stampPath).toBe(".tff/branch-meta.json");
	});

	it("accepts custom stampPath", () => {
		const err = new BranchMismatchError("a", "b", ".tff/custom-meta.json");
		expect(err.stampPath).toBe(".tff/custom-meta.json");
	});

	it("exposes repairHint for user guidance", () => {
		const err = new BranchMismatchError("milestone/M001", "main");
		expect(err.repairHint).toBe("/tff:repair (or git checkout milestone/M001)");
		expect(err.repairHint).toContain("milestone/M001");
	});

	it("has actionable error message with stampPath", () => {
		const err = new BranchMismatchError("milestone/M01", "main");
		expect(err.message).toContain("milestone/M01");
		expect(err.message).toContain("main");
		expect(err.message).toContain(".tff/branch-meta.json");
		expect(err.message).toContain("/tff:repair");
	});

	it("includes repair command in message", () => {
		const err = new BranchMismatchError("slice/M01-S03", "dev");
		expect(err.message).toContain("Run /tff:repair");
	});
});
