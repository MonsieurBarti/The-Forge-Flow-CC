import { z } from "zod";
export declare const DomainEventTypeSchema: z.ZodEnum<{
    SLICE_PLANNED: "SLICE_PLANNED";
    SLICE_STATUS_CHANGED: "SLICE_STATUS_CHANGED";
    TASK_COMPLETED: "TASK_COMPLETED";
}>;
export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;
export declare const DomainEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        SLICE_PLANNED: "SLICE_PLANNED";
        SLICE_STATUS_CHANGED: "SLICE_STATUS_CHANGED";
        TASK_COMPLETED: "TASK_COMPLETED";
    }>;
    occurredAt: z.ZodDate;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export declare const createDomainEvent: (type: DomainEventType, payload: Record<string, unknown>) => DomainEvent;
//# sourceMappingURL=domain-event.d.ts.map