import { z } from "zod";

export const DomainEventTypeSchema = z.enum(["SLICE_STATUS_CHANGED", "TASK_COMPLETED"]);

export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;

export const DomainEventSchema = z.object({
	id: z.string(),
	type: DomainEventTypeSchema,
	occurredAt: z.date(),
	payload: z.record(z.string(), z.unknown()),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const createDomainEvent = (
	type: DomainEventType,
	payload: Record<string, unknown>,
): DomainEvent => ({
	id: crypto.randomUUID(),
	type,
	occurredAt: new Date(),
	payload,
});
