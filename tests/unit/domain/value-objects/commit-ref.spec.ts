import { describe, expect, it } from "vitest";
import { CommitRefSchema } from "../../../../src/domain/value-objects/commit-ref.js";

describe("CommitRef", () => {
	it("should accept a valid 40-char SHA", () => {
		const sha = "a".repeat(40);
		const ref = CommitRefSchema.parse({ sha, message: "feat: something" });
		expect(ref.sha).toBe(sha);
	});

	it("should accept a valid 7-char short SHA", () => {
		const ref = CommitRefSchema.parse({ sha: "abc1234", message: "fix: thing" });
		expect(ref.sha).toBe("abc1234");
	});

	it("should reject an empty sha", () => {
		expect(() => CommitRefSchema.parse({ sha: "", message: "nope" })).toThrow();
	});
});
