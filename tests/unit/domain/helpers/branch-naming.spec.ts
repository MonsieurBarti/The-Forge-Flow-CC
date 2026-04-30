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
	adhocSliceLabel,
	milestoneBranchName,
	milestoneLabel,
	sliceBranchName,
	sliceLabel,
	sliceLabelFor,
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

	describe("adhocSliceLabel", () => {
		it("should format quick slice numbers as Q-##", () => {
			expect(adhocSliceLabel("quick", 1)).toBe("Q-01");
			expect(adhocSliceLabel("quick", 7)).toBe("Q-07");
			expect(adhocSliceLabel("quick", 99)).toBe("Q-99");
		});

		it("should format debug slice numbers as D-##", () => {
			expect(adhocSliceLabel("debug", 1)).toBe("D-01");
			expect(adhocSliceLabel("debug", 12)).toBe("D-12");
		});
	});

	describe("sliceLabelFor", () => {
		it("should return M##-S## when kind=milestone and milestone is provided", () => {
			expect(sliceLabelFor({ kind: "milestone", number: 3 }, { number: 1 })).toBe("M01-S03");
			expect(sliceLabelFor({ kind: "milestone", number: 12 }, { number: 2 })).toBe("M02-S12");
		});

		it("should return Q-## when kind=quick (ignoring milestone arg)", () => {
			expect(sliceLabelFor({ kind: "quick", number: 7 })).toBe("Q-07");
			expect(sliceLabelFor({ kind: "quick", number: 5 }, { number: 9 })).toBe("Q-05");
		});

		it("should return D-## when kind=debug", () => {
			expect(sliceLabelFor({ kind: "debug", number: 3 })).toBe("D-03");
			expect(sliceLabelFor({ kind: "debug", number: 11 }, { number: 9 })).toBe("D-11");
		});

		it("should throw when kind=milestone and milestone is missing", () => {
			expect(() => sliceLabelFor({ kind: "milestone", number: 1 })).toThrow(/milestone required/);
		});
	});
});
