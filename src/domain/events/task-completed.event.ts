import { createDomainEvent } from "./domain-event.js";

export const taskCompletedEvent = (taskId: string, sliceId: string, executor: string) =>
	createDomainEvent("TASK_COMPLETED", { taskId, sliceId, executor });
