import { describe, expect, it } from "vitest";
import { extractNgrams } from "../../../../src/application/patterns/extract-ngrams.js";
import type { Observation } from "../../../../src/domain/value-objects/observation.js";

describe("extractNgrams", () => {
	const obs: Observation[] = [
		{ ts: "1", session: "s1", tool: "Read", args: null, project: "/p1" },
		{ ts: "2", session: "s1", tool: "Grep", args: null, project: "/p1" },
		{ ts: "3", session: "s1", tool: "Edit", args: null, project: "/p1" },
		{ ts: "4", session: "s1", tool: "Bash", args: "npm test", project: "/p1" },
		{ ts: "5", session: "s2", tool: "Read", args: null, project: "/p2" },
		{ ts: "6", session: "s2", tool: "Grep", args: null, project: "/p2" },
		{ ts: "7", session: "s2", tool: "Edit", args: null, project: "/p2" },
	];

	it("should extract bigrams", () => {
		const result = extractNgrams(obs, 2);
		const keys = result.map((r) => r.sequence.join("→"));
		expect(keys).toContain("Read→Grep");
		expect(keys).toContain("Grep→Edit");
	});

	it("should extract trigrams", () => {
		const result = extractNgrams(obs, 3);
		const keys = result.map((r) => r.sequence.join("→"));
		expect(keys).toContain("Read→Grep→Edit");
	});

	it("should not cross session boundaries", () => {
		const result = extractNgrams(obs, 2);
		const keys = result.map((r) => r.sequence.join("→"));
		// Bash(s1) → Read(s2) should NOT exist as a bigram
		expect(keys).not.toContain("Bash→Read");
	});

	it("should track project distribution", () => {
		const result = extractNgrams(obs, 2);
		const readGrep = result.find((r) => r.sequence.join("→") === "Read→Grep");
		expect(readGrep).toBeDefined();
		expect(readGrep!.projects).toBe(2);
	});

	it("should count occurrences across sessions", () => {
		const result = extractNgrams(obs, 2);
		const readGrep = result.find((r) => r.sequence.join("→") === "Read→Grep");
		expect(readGrep!.count).toBe(2);
		expect(readGrep!.sessions).toBe(2);
	});

	it("should return empty for empty input", () => {
		expect(extractNgrams([], 2)).toHaveLength(0);
	});
});
