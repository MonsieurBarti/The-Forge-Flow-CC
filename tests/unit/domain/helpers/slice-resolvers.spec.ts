/**
 * Unit tests for slice resolvers (base branch / branch name dispatch).
 */

import { describe, expect, it } from "vitest";
import { sliceBranchName } from "../../../../src/domain/helpers/branch-naming.js";
import {
	resolveBaseBranch,
	resolveBranchName,
} from "../../../../src/domain/helpers/slice-resolvers.js";

describe("slice-resolvers", () => {
	describe("resolveBaseBranch", () => {
		it("should return slice.baseBranch when set", () => {
			expect(
				resolveBaseBranch({ id: "abc", baseBranch: "main" }, { branch: "milestone/xyz" }),
			).toBe("main");
		});

		it("should fall back to milestone.branch when baseBranch is undefined", () => {
			expect(resolveBaseBranch({ id: "abc" }, { branch: "milestone/xyz" })).toBe("milestone/xyz");
		});

		it("should throw when both baseBranch and milestone are undefined", () => {
			expect(() => resolveBaseBranch({ id: "abc" })).toThrow(
				/no base_branch and no parent milestone/,
			);
		});

		it("should throw when milestone is provided but its branch is undefined", () => {
			expect(() => resolveBaseBranch({ id: "abc" }, {})).toThrow(
				/no base_branch and no parent milestone/,
			);
		});
	});

	describe("resolveBranchName", () => {
		it("should return slice.branchName when set", () => {
			expect(
				resolveBranchName({ id: "12345678-0000-0000-0000-000000000000", branchName: "custom/x" }),
			).toBe("custom/x");
		});

		it("should fall back to sliceBranchName(slice.id) when branchName is undefined", () => {
			const id = "a1b2c3d4-5678-90ab-cdef-123456789abc";
			expect(resolveBranchName({ id })).toBe(sliceBranchName(id));
		});
	});
});
