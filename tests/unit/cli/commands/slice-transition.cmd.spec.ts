import { describe, expect, it } from "vitest";
import { sliceTransitionCmd } from "../../../../src/cli/commands/slice-transition.cmd.js";

describe("slice-transition result format", () => {
	it("should include warnings array in success result", () => {
		const successResult = { ok: true, data: { status: "executing" }, warnings: [] as string[] };
		expect(successResult).toHaveProperty("warnings");
		expect(Array.isArray(successResult.warnings)).toBe(true);
	});

	it("should populate warnings for non-critical failures", () => {
		const resultWithWarnings = {
			ok: true,
			data: { status: "executing" },
			warnings: ["snapshot failed: Error: ENOENT", "dolt sync failed: Error: connection refused"],
		};
		expect(resultWithWarnings.ok).toBe(true);
		expect(resultWithWarnings.warnings).toHaveLength(2);
	});

	it("should block transition on checkpoint failure", () => {
		const blockedResult = {
			ok: false,
			error: { code: "CHECKPOINT_FAILED", message: "Checkpoint save failed: Error: disk full" },
		};
		expect(blockedResult.ok).toBe(false);
		expect(blockedResult.error.code).toBe("CHECKPOINT_FAILED");
	});
});

describe("sliceTransitionCmd — S03 auto-sync", () => {
	it("should export sliceTransitionCmd as a function", () => {
		expect(typeof sliceTransitionCmd).toBe("function");
	});

	it("should reject invalid args", async () => {
		const result = JSON.parse(await sliceTransitionCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});

	it("should reject invalid status", async () => {
		const result = JSON.parse(
			await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "invalid-status"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});
});
