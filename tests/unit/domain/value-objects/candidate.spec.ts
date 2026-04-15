import { describe, expect, it } from "vitest";
import { CandidateSchema } from "../../../../src/domain/value-objects/candidate.js";

describe("Candidate", () => {
	it("should accept a valid candidate", () => {
		const c = CandidateSchema.parse({
			pattern: ["Read", "Grep", "Edit", "Bash(npm test)"],
			score: 0.78,
			evidence: { count: 12, sessions: 8, projects: 3 },
		});
		expect(c.score).toBe(0.78);
	});

	it("should reject score above 1", () => {
		expect(() =>
			CandidateSchema.parse({
				pattern: ["Read"],
				score: 1.5,
				evidence: { count: 1, sessions: 1, projects: 1 },
			}),
		).toThrow();
	});

	it("should reject negative score", () => {
		expect(() =>
			CandidateSchema.parse({
				pattern: ["Read"],
				score: -0.1,
				evidence: { count: 1, sessions: 1, projects: 1 },
			}),
		).toThrow();
	});
});
