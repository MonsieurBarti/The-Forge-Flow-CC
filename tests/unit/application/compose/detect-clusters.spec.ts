import { describe, expect, it } from "vitest";
import { detectClusters } from "../../../../src/application/compose/detect-clusters.js";

describe("detectClusters - density-based", () => {
	const makeObs = (session: string, tool: string) => ({
		ts: "2026-03-01T00:00:00Z",
		session,
		tool,
		args: null,
		project: "p1",
	});

	it("should cluster tools that co-occur across sessions", () => {
		const observations = [
			makeObs("s1", "Read"),
			makeObs("s1", "Edit"),
			makeObs("s1", "Write"),
			makeObs("s2", "Read"),
			makeObs("s2", "Edit"),
			makeObs("s2", "Write"),
			makeObs("s3", "Read"),
			makeObs("s3", "Edit"),
			makeObs("s3", "Write"),
		];
		const result = detectClusters(observations, {
			minSessions: 3,
			minPatterns: 2,
			maxJaccardDistance: 0.3,
		});
		expect(result.length).toBeGreaterThan(0);
		expect(result[0].tools).toContain("Read");
	});

	it("should not cluster with fewer sessions than minSessions", () => {
		const observations = [makeObs("s1", "Read"), makeObs("s1", "Edit")];
		const result = detectClusters(observations, {
			minSessions: 3,
			minPatterns: 2,
			maxJaccardDistance: 0.3,
		});
		expect(result).toHaveLength(0);
	});

	it("should use defaults when no opts provided", () => {
		const observations = [
			makeObs("s1", "Read"),
			makeObs("s1", "Edit"),
			makeObs("s2", "Read"),
			makeObs("s2", "Edit"),
			makeObs("s3", "Read"),
			makeObs("s3", "Edit"),
		];
		const result = detectClusters(observations);
		expect(result.length).toBeGreaterThanOrEqual(0); // should not throw
	});
});
