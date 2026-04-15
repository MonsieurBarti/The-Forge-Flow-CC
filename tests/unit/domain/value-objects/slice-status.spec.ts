import { describe, expect, it } from "vitest";
import {
	canTransition,
	SliceStatusSchema,
	validTransitionsFrom,
} from "../../../src/domain/slice-status.js";

describe("SliceStatus", () => {
	it("should accept all valid statuses", () => {
		const statuses = [
			"discussing",
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
			"closed",
		];
		for (const s of statuses) {
			expect(SliceStatusSchema.parse(s)).toBe(s);
		}
	});

	it("should reject invalid status", () => {
		expect(() => SliceStatusSchema.parse("flying")).toThrow();
	});

	describe("canTransition", () => {
		it("should allow discussing → researching", () => {
			expect(canTransition("discussing", "researching")).toBe(true);
		});

		it("should allow researching → planning", () => {
			expect(canTransition("researching", "planning")).toBe(true);
		});

		it("should allow planning → executing", () => {
			expect(canTransition("planning", "executing")).toBe(true);
		});

		it("should allow executing → verifying", () => {
			expect(canTransition("executing", "verifying")).toBe(true);
		});

		it("should allow verifying → reviewing", () => {
			expect(canTransition("verifying", "reviewing")).toBe(true);
		});

		it("should allow reviewing → completing", () => {
			expect(canTransition("reviewing", "completing")).toBe(true);
		});

		it("should allow completing → closed", () => {
			expect(canTransition("completing", "closed")).toBe(true);
		});

		it("should allow verifying → executing (replan loop)", () => {
			expect(canTransition("verifying", "executing")).toBe(true);
		});

		it("should allow reviewing → executing (fix loop)", () => {
			expect(canTransition("reviewing", "executing")).toBe(true);
		});

		it("should allow planning → planning (revision loop)", () => {
			expect(canTransition("planning", "planning")).toBe(true);
		});

		it("should reject discussing → executing (skip)", () => {
			expect(canTransition("discussing", "executing")).toBe(false);
		});

		it("should reject closed → anything", () => {
			expect(canTransition("closed", "discussing")).toBe(false);
		});
	});

	describe("validTransitionsFrom", () => {
		it("should return valid next statuses for discussing", () => {
			expect(validTransitionsFrom("discussing")).toEqual(["researching"]);
		});

		it("should return multiple options for verifying", () => {
			const transitions = validTransitionsFrom("verifying");
			expect(transitions).toContain("reviewing");
			expect(transitions).toContain("executing");
		});
	});
});
