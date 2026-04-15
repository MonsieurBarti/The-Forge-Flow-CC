import { z } from "zod";
import type { DomainError } from "../errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { type Result } from "../result.js";
import { type SliceStatus } from "../value-objects/slice-status.js";
export declare const SliceSchema: z.ZodObject<{
    id: z.ZodString;
    milestoneId: z.ZodString;
    number: z.ZodNumber;
    title: z.ZodString;
    status: z.ZodEnum<{
        closed: "closed";
        discussing: "discussing";
        researching: "researching";
        planning: "planning";
        executing: "executing";
        verifying: "verifying";
        reviewing: "reviewing";
        completing: "completing";
    }>;
    tier: z.ZodOptional<z.ZodEnum<{
        S: "S";
        "F-lite": "F-lite";
        "F-full": "F-full";
    }>>;
    createdAt: z.ZodDate;
}, z.core.$strip>;
export type Slice = z.infer<typeof SliceSchema>;
export declare const createSlice: (input: {
    milestoneId: string;
    title: string;
    milestoneNumber: number;
    sliceNumber: number;
}) => Slice;
export declare const formatSliceId: (milestoneNumber: number, sliceNumber: number) => string;
export declare const transitionSlice: (slice: Slice, to: SliceStatus) => Result<{
    slice: Slice;
    events: DomainEvent[];
}, DomainError>;
//# sourceMappingURL=slice.d.ts.map