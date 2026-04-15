import { z } from "zod";
import { createDomainError, type DomainError } from "../errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { taskCompletedEvent } from "../events/task-completed.event.js";
import { Err, Ok, type Result } from "../result.js";

export const TaskStatusSchema = z.enum(["open", "in_progress", "closed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
	id: z.string().min(1),
	sliceId: z.string().min(1),
	number: z.number().int().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	status: TaskStatusSchema,
	wave: z.number().int().nonnegative().optional(),
	claimedAt: z.date().optional(),
	claimedBy: z.string().optional(),
	closedReason: z.string().optional(),
	createdAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const createTask = (input: {
	sliceId: string;
	number: number;
	title: string;
	description?: string;
}): Task => {
	const task = {
		id: `${input.sliceId}-T${input.number.toString().padStart(2, "0")}`,
		sliceId: input.sliceId,
		number: input.number,
		title: input.title,
		description: input.description,
		status: "open" as const,
		createdAt: new Date(),
	};
	return TaskSchema.parse(task);
};

export const startTask = (task: Task): Result<Task, DomainError> => {
	if (task.status !== "open") {
		return Err(
			createDomainError(
				"INVALID_TRANSITION",
				`Cannot start task "${task.id}" — status is "${task.status}", expected "open"`,
				{ taskId: task.id, status: task.status },
			),
		);
	}

	return Ok({ ...task, status: "in_progress" as const });
};

export const completeTask = (
	task: Task,
	executor: string,
): Result<{ task: Task; events: DomainEvent[] }, DomainError> => {
	if (task.status !== "in_progress") {
		return Err(
			createDomainError(
				"INVALID_TRANSITION",
				`Cannot complete task "${task.id}" — status is "${task.status}", expected "in_progress"`,
				{ taskId: task.id, status: task.status },
			),
		);
	}

	const updated: Task = { ...task, status: "closed" };
	const event = taskCompletedEvent(task.id, task.sliceId, executor);

	return Ok({ task: updated, events: [event] });
};
