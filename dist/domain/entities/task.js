import { z } from "zod";
import { createDomainError } from "../errors/domain-error.js";
import { taskCompletedEvent } from "../events/task-completed.event.js";
import { Err, Ok } from "../result.js";
export const TaskStatusSchema = z.enum(["open", "in_progress", "closed"]);
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
export const createTask = (input) => {
    const task = {
        id: `${input.sliceId}-T${input.number.toString().padStart(2, "0")}`,
        sliceId: input.sliceId,
        number: input.number,
        title: input.title,
        description: input.description,
        status: "open",
        createdAt: new Date(),
    };
    return TaskSchema.parse(task);
};
export const startTask = (task) => {
    if (task.status !== "open") {
        return Err(createDomainError("INVALID_TRANSITION", `Cannot start task "${task.id}" — status is "${task.status}", expected "open"`, { taskId: task.id, status: task.status }));
    }
    return Ok({ ...task, status: "in_progress" });
};
export const completeTask = (task, executor) => {
    if (task.status !== "in_progress") {
        return Err(createDomainError("INVALID_TRANSITION", `Cannot complete task "${task.id}" — status is "${task.status}", expected "in_progress"`, { taskId: task.id, status: task.status }));
    }
    const updated = { ...task, status: "closed" };
    const event = taskCompletedEvent(task.id, task.sliceId, executor);
    return Ok({ task: updated, events: [event] });
};
//# sourceMappingURL=task.js.map