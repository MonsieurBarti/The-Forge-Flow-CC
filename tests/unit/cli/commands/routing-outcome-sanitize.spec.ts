import { describe, expect, it } from "vitest";
import { sanitizeReason } from "../../../../src/cli/commands/routing-outcome.cmd.js";

describe("sanitizeReason", () => {
	it("passes plain text through", () => {
		expect(sanitizeReason("needed opus")).toBe("needed opus");
	});

	it("strips control chars (newlines, tabs, DEL)", () => {
		expect(sanitizeReason("line1\nline2\ttail\x7Fend")).toBe("line1 line2 tail end");
	});

	it("trims whitespace", () => {
		expect(sanitizeReason("   edges   ")).toBe("edges");
	});

	it("returns undefined for empty or whitespace-only", () => {
		expect(sanitizeReason("")).toBeUndefined();
		expect(sanitizeReason("   \t\n  ")).toBeUndefined();
	});

	it("returns undefined when input is undefined", () => {
		expect(sanitizeReason(undefined)).toBeUndefined();
	});
});
