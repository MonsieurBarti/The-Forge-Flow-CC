/**
 * T02 Test: Branch naming helpers
 *
 * This test verifies the branch naming helper functions.
 *
 * TDD Cycle:
 * 1. Write failing test → helpers don't exist yet
 * 2. Implement the module → test should pass
 * 3. Commit
 */

import { describe, expect, it } from "vitest";
import {
	milestoneBranchName,
	milestoneLabel,
	sliceBranchName,
	sliceLabel,
} from "../../../../src/domain/helpers/branch-naming.js";

describe("T02: Branch naming helpers", () => {
	describe("milestoneLabel", () => {
		it("should format milestone number as M##", () => {
			expect(milestoneLabel(1)).toBe("M01");
			expect(milestoneLabel(9)).toBe("M09");
			expect(milestoneLabel(12)).toBe("M12");
			expect(milestoneLabel(100)).toBe("M100");
		});
	});

	describe("sliceLabel", () => {
		it("should format slice label as M##-S##", () => {
			expect(sliceLabel(1, 1)).toBe("M01-S01");
			expect(sliceLabel(2, 12)).toBe("M02-S12");
			expect(sliceLabel(10, 5)).toBe("M10-S05");
		});
	});

	describe("milestoneBranchName", () => {
		it("should create branch name from 8-char UUID prefix", () => {
			expect(milestoneBranchName("a1b2c3d4-5678-90ab-cdef-123456789abc")).toBe(
				"milestone/a1b2c3d4",
			);
			expect(milestoneBranchName("12345678-0000-0000-0000-000000000000")).toBe(
				"milestone/12345678",
			);
		});

		it("should handle short UUIDs gracefully", () => {
			// Should still work with shorter strings (edge case)
			expect(milestoneBranchName("abcd")).toBe("milestone/abcd");
		});
	});

	describe("sliceBranchName", () => {
		it("should create branch name from 8-char UUID prefix", () => {
			expect(sliceBranchName("a1b2c3d4-5678-90ab-cdef-123456789abc")).toBe("slice/a1b2c3d4");
			expect(sliceBranchName("12345678-0000-0000-0000-000000000000")).toBe("slice/12345678");
		});

		it("should handle short UUIDs gracefully", () => {
			// Should still work with shorter strings (edge case)
			expect(sliceBranchName("abcd")).toBe("slice/abcd");
		});
	});
});
