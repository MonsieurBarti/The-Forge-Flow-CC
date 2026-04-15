import { createDomainEvent } from "./domain-event.js";
export const taskCompletedEvent = (taskId, sliceId, executor) => createDomainEvent("TASK_COMPLETED", { taskId, sliceId, executor });
//# sourceMappingURL=task-completed.event.js.map