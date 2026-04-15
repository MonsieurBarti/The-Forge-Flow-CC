import { describe, expect, it } from "vitest";
import {
	createMilestone,
	formatMilestoneNumber,
	MilestoneSchema,
} from "../../../../src/domain/entities/milestone.js";

describe("Milestone", () => {
	it("should create a milestone with human-readable ID", () => {
		const ms = createMilestone({
			projectId: "singleton",
			name: "MVP",
			number: 1,
		});
		expect(ms.id).toBe("M01");
		expect(ms.name).toBe("MVP");
		expect(ms.number).toBe(1);
		expect(ms.status).toBe("open");
	});

	it("should include closeReason as optional", () => {
		const ms = createMilestone({
			projectId: "singleton",
			name: "Test",
			number: 2,
		});
		expect(ms.closeReason).toBeUndefined();
		const withReason = { ...ms, closeReason: "Done" };
		expect(() => MilestoneSchema.parse(withReason)).not.toThrow();
	});

	it("should format milestone number as M01", () => {
		expect(formatMilestoneNumber(1)).toBe("M01");
		expect(formatMilestoneNumber(12)).toBe("M12");
	});

	it("should validate against schema", () => {
		const ms = createMilestone({
			projectId: "singleton",
			name: "Release",
			number: 2,
		});
		expect(() => MilestoneSchema.parse(ms)).not.toThrow();
	});

	it("should reject number less than 1", () => {
		expect(() =>
			createMilestone({
				projectId: "singleton",
				name: "Bad",
				number: 0,
			}),
		).toThrow();
	});
});
