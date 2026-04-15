import { describe, expect, it } from "vitest";
import { createEscalation } from "../../../src/application/lifecycle/escalate.js";

describe("escalate", () => {
	it("should create escalation with blocker context", () => {
		const e = createEscalation({
			sliceId: "M01-S01",
			phase: "verifying",
			reason: "AC #3 fails",
			attempts: 2,
			lastError: "count mismatch",
		});
		expect(e.sliceId).toBe("M01-S01");
		expect(e.phase).toBe("verifying");
		expect(e.reason).toContain("AC #3");
		expect(e.attempts).toBe(2);
		expect(e.createdAt).toBeDefined();
	});
});
