import { describe, expect, it } from "vitest";
import {
	getValidNext,
	isTerminal,
	SLICE_EDGES,
	validate,
} from "../../../../src/domain/state-machine/slice-state-machine.js";

describe("slice state machine", () => {
	it("enumerates every edge from the domain's canTransition table", () => {
		expect(SLICE_EDGES.length).toBeGreaterThan(0);
	});

	it("validate() returns ok for a legal edge", () => {
		expect(validate("planning", "executing")).toEqual({ ok: true });
	});

	it("validate() returns a violation for an illegal edge", () => {
		const r = validate("discussing", "closed");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violation.code).toBe("ILLEGAL_TRANSITION");
			expect(r.violation.expected).toContain("researching");
			expect(r.violation.actual).toBe("closed");
		}
	});

	it("isTerminal returns true for closed, false otherwise", () => {
		expect(isTerminal("closed")).toBe(true);
		expect(isTerminal("executing")).toBe(false);
	});

	it("getValidNext matches the domain's validTransitionsFrom", () => {
		expect(getValidNext("planning")).toEqual(["planning", "executing"]);
	});
});
