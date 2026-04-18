import { describe, expect, it } from "vitest";
import { syncStateSchema } from "../../../../src/cli/commands/sync-state.cmd.js";
import { parseFlags } from "../../../../src/cli/utils/flag-parser.js";

describe("syncStateSchema — flag parsing", () => {
	it("accepts a display label (M01)", () => {
		const result = parseFlags(["--milestone-id", "M01"], syncStateSchema);
		expect(result.ok).toBe(true);
	});

	it("accepts a UUID", () => {
		const result = parseFlags(
			["--milestone-id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
			syncStateSchema,
		);
		expect(result.ok).toBe(true);
	});

	it("rejects garbage input", () => {
		const result = parseFlags(["--milestone-id", "not-valid!!"], syncStateSchema);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("PATTERN_MISMATCH");
	});
});
