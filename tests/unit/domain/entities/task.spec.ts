import { describe, expect, it } from "vitest";
import {
	completeTask,
	createTask,
	startTask,
	TaskSchema,
} from "../../../../src/domain/entities/task.js";
import { isErr, isOk } from "../../../../src/domain/result.js";

describe("Task", () => {
	const makeTask = () =>
		createTask({
			sliceId: "M01-S01",
			number: 3,
			title: "Implement login",
		});

	it("should create a task with human-readable id", () => {
		const task = makeTask();
		expect(task.id).toBe("M01-S01-T03");
		expect(task.status).toBe("open");
		expect(task.title).toBe("Implement login");
		expect(task.number).toBe(3);
	});

	it("should not have removed fields", () => {
		const task = makeTask();
		expect(task).not.toHaveProperty("name");
		expect(task).not.toHaveProperty("taskRef");
		expect(task).not.toHaveProperty("sliceRef");
		expect(task).not.toHaveProperty("acceptanceCriteria");
		expect(task).not.toHaveProperty("executor");
		expect(task).not.toHaveProperty("dependsOn");
	});

	it("should allow optional description", () => {
		const task = createTask({
			sliceId: "M01-S01",
			number: 1,
			title: "Task",
			description: "Some desc",
		});
		expect(task.description).toBe("Some desc");
	});

	it("should validate against schema", () => {
		expect(() => TaskSchema.parse(makeTask())).not.toThrow();
	});

	describe("startTask", () => {
		it("should transition open task to in_progress", () => {
			const task = makeTask();
			const result = startTask(task);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.status).toBe("in_progress");
			}
		});

		it("should reject starting an already in_progress task", () => {
			const task = { ...makeTask(), status: "in_progress" as const };
			const result = startTask(task);
			expect(isErr(result)).toBe(true);
		});

		it("should reject starting a closed task", () => {
			const task = { ...makeTask(), status: "closed" as const };
			const result = startTask(task);
			expect(isErr(result)).toBe(true);
		});
	});

	describe("completeTask", () => {
		it("should mark an in_progress task as closed", () => {
			const task = { ...makeTask(), status: "in_progress" as const };
			const result = completeTask(task, "backend-dev");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.task.status).toBe("closed");
				expect(result.data.events[0].type).toBe("TASK_COMPLETED");
			}
		});

		it("should reject completing an open task", () => {
			const task = makeTask();
			const result = completeTask(task, "backend-dev");
			expect(isErr(result)).toBe(true);
		});

		it("should reject completing a closed task", () => {
			const task = { ...makeTask(), status: "closed" as const };
			const result = completeTask(task, "backend-dev");
			expect(isErr(result)).toBe(true);
		});
	});
});
