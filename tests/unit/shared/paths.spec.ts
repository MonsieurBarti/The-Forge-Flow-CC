/**
 * Unit tests for path helpers — quick/debug bucket dirs and the sliceDirFor dispatcher.
 */

import { describe, expect, it } from "vitest";
import {
	DEBUG_DIR,
	debugSliceDir,
	QUICK_DIR,
	quickSliceDir,
	sliceDirFor,
} from "../../../src/shared/paths.js";

describe("paths", () => {
	describe("QUICK_DIR / DEBUG_DIR", () => {
		it("should expose .tff-cc/quick and .tff-cc/debug bucket roots", () => {
			expect(QUICK_DIR).toBe(".tff-cc/quick");
			expect(DEBUG_DIR).toBe(".tff-cc/debug");
		});
	});

	describe("quickSliceDir", () => {
		it("should produce .tff-cc/quick/{label}", () => {
			expect(quickSliceDir("Q-07")).toBe(".tff-cc/quick/Q-07");
		});
	});

	describe("debugSliceDir", () => {
		it("should produce .tff-cc/debug/{label}", () => {
			expect(debugSliceDir("D-03")).toBe(".tff-cc/debug/D-03");
		});
	});

	describe("sliceDirFor", () => {
		it("should return milestone slice dir when kind=milestone and label provided", () => {
			expect(sliceDirFor({ kind: "milestone" }, "M01", "M01-S01")).toBe(
				".tff-cc/milestones/M01/slices/M01-S01",
			);
		});

		it("should return quick bucket dir when kind=quick", () => {
			expect(sliceDirFor({ kind: "quick" }, undefined, "Q-07")).toBe(".tff-cc/quick/Q-07");
		});

		it("should return debug bucket dir when kind=debug", () => {
			expect(sliceDirFor({ kind: "debug" }, undefined, "D-03")).toBe(".tff-cc/debug/D-03");
		});

		it("should throw when kind=milestone but milestoneLabel is missing", () => {
			expect(() => sliceDirFor({ kind: "milestone" }, undefined, "M01-S01")).toThrow(
				/milestoneLabel required/,
			);
		});
	});
});
