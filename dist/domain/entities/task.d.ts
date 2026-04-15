import { z } from "zod";
import { type DomainError } from "../errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { type Result } from "../result.js";
export declare const TaskStatusSchema: z.ZodEnum<{
    open: "open";
    in_progress: "in_progress";
    closed: "closed";
}>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    sliceId: z.ZodString;
    number: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        open: "open";
        in_progress: "in_progress";
        closed: "closed";
    }>;
    wave: z.ZodOptional<z.ZodNumber>;
    claimedAt: z.ZodOptional<z.ZodDate>;
    claimedBy: z.ZodOptional<z.ZodString>;
    closedReason: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
}, z.core.$strip>;
export type Task = z.infer<typeof TaskSchema>;
export declare const createTask: (input: {
    sliceId: string;
    number: number;
    title: string;
    description?: string;
}) => Task;
export declare const startTask: (task: Task) => Result<Task, DomainError>;
export declare const completeTask: (task: Task, executor: string) => Result<{
    task: Task;
    events: DomainEvent[];
}, DomainError>;
//# sourceMappingURL=task.d.ts.map