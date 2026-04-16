import { describe, expect, it } from "vitest";
import { createTask, TaskSchema } from "../../../../src/domain/entities/task.js";
import { TaskPropsSchema } from "../../../../src/domain/value-objects/task-props.js";
import { TaskUpdatePropsSchema } from "../../../../src/domain/value-objects/task-update-props.js";

describe("Task difficulty field", () => {
	it("TaskSchema should accept optional difficulty field", () => {
		const task = {
			id: "M01-S01-T01",
			sliceId: "M01-S01",
			number: 1,
			title: "Test task",
			status: "open",
			createdAt: new Date(),
			difficulty: "high" as const,
		};
		const parsed = TaskSchema.parse(task);
		expect(parsed.difficulty).toBe("high");
	});

	it("TaskSchema should work without difficulty field (backward compatible)", () => {
		const task = {
			id: "M01-S01-T01",
			sliceId: "M01-S01",
			number: 1,
			title: "Test task",
			status: "open",
			createdAt: new Date(),
		};
		const parsed = TaskSchema.parse(task);
		expect(parsed.difficulty).toBeUndefined();
	});

	it("TaskPropsSchema should accept optional difficulty field", () => {
		const props = {
			sliceId: "M01-S01",
			number: 1,
			title: "Test task",
			difficulty: "low" as const,
		};
		const parsed = TaskPropsSchema.parse(props);
		expect(parsed.difficulty).toBe("low");
	});

	it("TaskUpdatePropsSchema should accept optional difficulty field", () => {
		const props = {
			difficulty: "medium" as const,
		};
		const parsed = TaskUpdatePropsSchema.parse(props);
		expect(parsed.difficulty).toBe("medium");
	});

	it("createTask should propagate difficulty if provided", () => {
		const task = createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Test task",
			difficulty: "high",
		});
		expect(task.difficulty).toBe("high");
	});
});
