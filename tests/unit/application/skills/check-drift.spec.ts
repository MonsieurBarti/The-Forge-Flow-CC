import { describe, expect, it } from "vitest";
import { checkDrift } from "../../../src/application/skills/check-drift.js";

describe("checkDrift", () => {
	it("should return 0 drift when content is identical", () => {
		const result = checkDrift("original content", "original content");
		expect(result.driftScore).toBe(0);
		expect(result.overThreshold).toBe(false);
	});

	it("should detect drift when content changes", () => {
		const original = "a".repeat(100);
		const current = "b".repeat(30) + "a".repeat(70);
		const result = checkDrift(original, current);
		expect(result.driftScore).toBeGreaterThan(0);
	});

	it("should flag when drift exceeds threshold", () => {
		const original = "a".repeat(100);
		const current = "b".repeat(70) + "a".repeat(30);
		const result = checkDrift(original, current, { maxDrift: 0.6 });
		expect(result.overThreshold).toBe(true);
	});

	it("should respect custom maxDrift parameter", () => {
		// drift score = 0.25 (10 chars differ out of 40)
		const original = "aaaaaaaaaa_bbbbb_ccccc_ddddd_eeeee_fffff";
		const current = "aaaaaaaaaa_xxxxx_ccccc_yyyyy_eeeee_fffff";
		const result = checkDrift(original, current, { maxDrift: 0.2 });
		// 0.25 > 0.2 strict threshold → over
		expect(result.overThreshold).toBe(true);
	});

	it("should use 0.6 default when no maxDrift provided", () => {
		// Same pair, drift score = 0.25
		const original = "aaaaaaaaaa_bbbbb_ccccc_ddddd_eeeee_fffff";
		const current = "aaaaaaaaaa_xxxxx_ccccc_yyyyy_eeeee_fffff";
		const result = checkDrift(original, current);
		// 0.25 < 0.6 default threshold → under
		expect(result.overThreshold).toBe(false);
	});
});
