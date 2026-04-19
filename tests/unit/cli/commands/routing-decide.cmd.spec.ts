import { describe, expect, it } from "vitest";
import { routingDecideCmd } from "../../../../src/cli/commands/routing-decide.cmd.js";

describe("routing:decide", () => {
	it("returns skipped when routing disabled (no settings.yaml in cwd)", async () => {
		const out = await routingDecideCmd([
			"--slice-id",
			"M01-S01",
			"--workflow",
			"tff:ship",
			"--json",
		]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.skipped).toBe(true);
	});

	it("returns error for missing required flags", async () => {
		const out = await routingDecideCmd(["--slice-id", "M01-S01"]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
	});

	it("validates slice-id pattern", async () => {
		const out = await routingDecideCmd(["--slice-id", "bad", "--workflow", "tff:ship"]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
	});
});
