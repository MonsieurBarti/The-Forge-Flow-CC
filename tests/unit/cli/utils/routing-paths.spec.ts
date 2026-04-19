import { describe, expect, it } from "vitest";
import { resolveRoutingPaths } from "../../../../src/cli/utils/routing-paths.js";

describe("resolveRoutingPaths", () => {
	it("resolves relative logging paths under projectRoot", () => {
		const { routingPath, outcomesPath, reportPath } = resolveRoutingPaths(
			"/tmp/proj",
			".tff-cc/logs/routing.jsonl",
		);
		expect(routingPath).toBe("/tmp/proj/.tff-cc/logs/routing.jsonl");
		expect(outcomesPath).toBe("/tmp/proj/.tff-cc/logs/routing-outcomes.jsonl");
		expect(reportPath).toBe("/tmp/proj/.tff-cc/logs/routing-calibration.md");
	});

	it("preserves absolute logging paths", () => {
		const { routingPath, outcomesPath, reportPath } = resolveRoutingPaths(
			"/tmp/proj",
			"/var/logs/routing.jsonl",
		);
		expect(routingPath).toBe("/var/logs/routing.jsonl");
		expect(outcomesPath).toBe("/var/logs/routing-outcomes.jsonl");
		expect(reportPath).toBe("/var/logs/routing-calibration.md");
	});
});
