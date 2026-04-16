import { describe, expect, it } from "vitest";
import {
	createMilestone,
	MilestoneSchema,
	milestoneLabel,
} from "../../../../src/domain/entities/milestone.js";

describe("Milestone", () => {
	it("should create a milestone with UUID id", () => {
		const ms = createMilestone({
			projectId: "singleton",
			name: "MVP",
			number: 1,
		});
		// ID should be a UUID, not a label
		expect(ms.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(ms.name).toBe("MVP");
		expect(ms.number).toBe(1);
		expect(ms.status).toBe("open");
	});

	it("should have a branch field computed from UUID", () => {
		const ms = createMilestone({
			projectId: "singleton",
			name: "Test",
			number: 2,
		});
		// Branch should be milestone/<8-char-uuid-prefix>
		expect(ms.branch).toMatch(/^milestone\/[0-9a-f]{8}$/);
		// Branch prefix should match first 8 chars of id
		const prefix = ms.id.slice(0, 8);
		expect(ms.branch).toBe(`milestone/${prefix}`);
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

	it("should format milestone number as M## via milestoneLabel function", () => {
		expect(milestoneLabel(1)).toBe("M01");
		expect(milestoneLabel(12)).toBe("M12");
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
