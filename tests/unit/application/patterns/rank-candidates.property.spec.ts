import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { rankCandidates } from "../../../src/application/patterns/rank-candidates.js";

/** Arbitrary that produces 4 weights summing to exactly 1 */
const normalizedWeights = fc
	.tuple(
		fc.float({ min: 0, max: 1, noNaN: true }),
		fc.float({ min: 0, max: 1, noNaN: true }),
		fc.float({ min: 0, max: 1, noNaN: true }),
		fc.float({ min: 0, max: 1, noNaN: true }),
	)
	.map(([a, b, c, d]) => {
		const sum = a + b + c + d || 1; // avoid division by zero
		return {
			frequency: a / sum,
			breadth: b / sum,
			recency: c / sum,
			consistency: d / sum,
		};
	});

describe("rankCandidates - property-based", () => {
	it("scores should always be between 0 and 1", () => {
		fc.assert(
			fc.property(normalizedWeights, (weights) => {
				const patterns = [
					{
						sequence: ["Read"],
						count: 5,
						sessions: 3,
						projects: 2,
						lastSeen: new Date().toISOString(),
					},
				];
				const result = rankCandidates(patterns, {
					totalProjects: 5,
					totalSessions: 10,
					now: new Date().toISOString(),
					weights,
				});
				expect(result[0].score).toBeGreaterThanOrEqual(0);
				expect(result[0].score).toBeLessThanOrEqual(1);
			}),
		);
	});

	it("empty patterns should return empty results", () => {
		fc.assert(
			fc.property(normalizedWeights, (weights) => {
				const result = rankCandidates([], {
					totalProjects: 5,
					totalSessions: 10,
					now: new Date().toISOString(),
					weights,
				});
				expect(result).toHaveLength(0);
			}),
		);
	});

	it("all-zero weights should produce zero scores", () => {
		const patterns = [
			{
				sequence: ["Read"],
				count: 100,
				sessions: 50,
				projects: 10,
				lastSeen: new Date().toISOString(),
			},
		];
		const result = rankCandidates(patterns, {
			totalProjects: 10,
			totalSessions: 50,
			now: new Date().toISOString(),
			weights: { frequency: 0, breadth: 0, recency: 0, consistency: 0 },
		});
		expect(result[0].score).toBe(0);
	});
});
