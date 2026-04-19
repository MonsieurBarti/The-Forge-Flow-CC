import { describe, expect, it } from "vitest";
import {
	nextWorkflow,
	shouldAutoTransition,
	suggestedCommand,
} from "../../../../src/application/lifecycle/chain-workflow.js";

describe("chain-workflow", () => {
	it("discussing → research-slice", () => {
		expect(nextWorkflow("discussing")).toBe("research-slice");
	});
	it("researching → plan-slice", () => {
		expect(nextWorkflow("researching")).toBe("plan-slice");
	});
	it("planning → null (gate)", () => {
		expect(nextWorkflow("planning")).toBeNull();
	});
	it("executing → verify-slice", () => {
		expect(nextWorkflow("executing")).toBe("verify-slice");
	});
	it("verifying → ship-slice", () => {
		expect(nextWorkflow("verifying")).toBe("ship-slice");
	});
	it("completing → null (gate)", () => {
		expect(nextWorkflow("completing")).toBeNull();
	});
	it("auto-transition in plan-to-pr", () => {
		expect(shouldAutoTransition("executing", "plan-to-pr")).toBe(true);
	});
	it("no auto-transition in guided", () => {
		expect(shouldAutoTransition("executing", "guided")).toBe(false);
	});
	it("never auto at gates", () => {
		expect(shouldAutoTransition("planning", "plan-to-pr")).toBe(false);
		expect(shouldAutoTransition("completing", "plan-to-pr")).toBe(false);
	});
});

describe("suggestedCommand", () => {
	it.each([
		["discussing", "/tff:discuss"],
		["researching", "/tff:research"],
		["planning", "/tff:plan"],
		["executing", "/tff:execute"],
		["verifying", "/tff:verify"],
		["reviewing", "/tff:ship"],
		["completing", "/tff:complete-milestone"],
		// closed → next slice starts in `discussing`
		["closed", "/tff:discuss"],
	])("%s → %s", (status, expected) => {
		expect(suggestedCommand(status)).toBe(expected);
	});

	it("returns null for unknown status", () => {
		expect(suggestedCommand("bogus-status")).toBeNull();
	});
});
