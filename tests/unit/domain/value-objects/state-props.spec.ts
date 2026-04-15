import { describe, expect, it } from "vitest";
import { DependencySchema } from "../../../src/domain/dependency.js";
import { MilestonePropsSchema } from "../../../src/domain/milestone-props.js";
import { MilestoneStatusSchema } from "../../../src/domain/milestone-status.js";
import { MilestoneUpdatePropsSchema } from "../../../src/domain/milestone-update-props.js";
import { ProjectPropsSchema } from "../../../src/domain/project-props.js";
import { SlicePropsSchema } from "../../../src/domain/slice-props.js";
import { SliceUpdatePropsSchema } from "../../../src/domain/slice-update-props.js";
import { TaskPropsSchema } from "../../../src/domain/task-props.js";
import { TaskUpdatePropsSchema } from "../../../src/domain/task-update-props.js";
import { WorkflowSessionSchema } from "../../../src/domain/workflow-session.js";

describe("MilestoneStatus (extracted)", () => {
	it("accepts valid statuses", () => {
		expect(MilestoneStatusSchema.safeParse("open").success).toBe(true);
		expect(MilestoneStatusSchema.safeParse("in_progress").success).toBe(true);
		expect(MilestoneStatusSchema.safeParse("closed").success).toBe(true);
	});
	it("rejects invalid status", () => {
		expect(MilestoneStatusSchema.safeParse("unknown").success).toBe(false);
	});
});

describe("ProjectProps", () => {
	it("accepts valid props", () => {
		expect(ProjectPropsSchema.safeParse({ name: "My Project" }).success).toBe(true);
	});
	it("vision is optional", () => {
		expect(ProjectPropsSchema.safeParse({ name: "P", vision: "V" }).success).toBe(true);
	});
	it("rejects empty name", () => {
		expect(ProjectPropsSchema.safeParse({ name: "" }).success).toBe(false);
	});
});

describe("MilestoneProps", () => {
	it("requires number and name", () => {
		expect(MilestonePropsSchema.safeParse({ number: 1, name: "M1" }).success).toBe(true);
	});
});

describe("MilestoneUpdateProps", () => {
	it("allows partial updates", () => {
		expect(MilestoneUpdatePropsSchema.safeParse({ name: "New Name" }).success).toBe(true);
	});
	it("accepts empty object", () => {
		expect(MilestoneUpdatePropsSchema.safeParse({}).success).toBe(true);
	});
});

describe("SliceProps", () => {
	it("requires milestoneId, number, title", () => {
		expect(
			SlicePropsSchema.safeParse({ milestoneId: "M01", number: 1, title: "Slice" }).success,
		).toBe(true);
	});
	it("tier is optional", () => {
		expect(
			SlicePropsSchema.safeParse({ milestoneId: "M01", number: 1, title: "S", tier: "F-lite" })
				.success,
		).toBe(true);
	});
});

describe("SliceUpdateProps", () => {
	it("allows partial updates", () => {
		expect(SliceUpdatePropsSchema.safeParse({ title: "New" }).success).toBe(true);
	});
});

describe("TaskProps", () => {
	it("requires sliceId, number, title", () => {
		expect(
			TaskPropsSchema.safeParse({ sliceId: "M01-S01", number: 1, title: "Task" }).success,
		).toBe(true);
	});
});

describe("TaskUpdateProps", () => {
	it("cannot set sliceId or number", () => {
		const result = TaskUpdatePropsSchema.safeParse({ sliceId: "other", number: 99, title: "ok" });
		if (result.success) {
			expect(result.data).not.toHaveProperty("sliceId");
			expect(result.data).not.toHaveProperty("number");
		}
	});
});

describe("Dependency", () => {
	it("validates blocks type", () => {
		expect(DependencySchema.safeParse({ fromId: "t1", toId: "t2", type: "blocks" }).success).toBe(
			true,
		);
	});
	it("rejects unknown types", () => {
		expect(
			DependencySchema.safeParse({ fromId: "t1", toId: "t2", type: "validates" }).success,
		).toBe(false);
	});
});

describe("WorkflowSession", () => {
	it("requires phase, rest optional", () => {
		expect(WorkflowSessionSchema.safeParse({ phase: "idle" }).success).toBe(true);
	});
});
