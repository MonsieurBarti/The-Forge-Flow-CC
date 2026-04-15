import { z } from "zod";
export const DomainEventTypeSchema = z.enum([
    "SLICE_PLANNED",
    "SLICE_STATUS_CHANGED",
    "TASK_COMPLETED",
]);
export const DomainEventSchema = z.object({
    id: z.string(),
    type: DomainEventTypeSchema,
    occurredAt: z.date(),
    payload: z.record(z.string(), z.unknown()),
});
export const createDomainEvent = (type, payload) => ({
    id: crypto.randomUUID(),
    type,
    occurredAt: new Date(),
    payload,
});
//# sourceMappingURL=domain-event.js.map