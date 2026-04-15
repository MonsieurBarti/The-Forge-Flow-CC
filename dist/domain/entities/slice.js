import { z } from "zod";
import { invalidTransitionError } from "../errors/invalid-transition.error.js";
import { sliceStatusChangedEvent } from "../events/slice-status-changed.event.js";
import { Err, Ok } from "../result.js";
import { ComplexityTierSchema } from "../value-objects/complexity-tier.js";
import { canTransition, SliceStatusSchema, } from "../value-objects/slice-status.js";
export const SliceSchema = z.object({
    id: z.string().min(1),
    milestoneId: z.string().min(1),
    number: z.number().int().min(1),
    title: z.string().min(1),
    status: SliceStatusSchema,
    tier: ComplexityTierSchema.optional(),
    createdAt: z.date(),
});
export const createSlice = (input) => {
    const slice = {
        id: formatSliceId(input.milestoneNumber, input.sliceNumber),
        milestoneId: input.milestoneId,
        number: input.sliceNumber,
        title: input.title,
        status: "discussing",
        createdAt: new Date(),
    };
    return SliceSchema.parse(slice);
};
export const formatSliceId = (milestoneNumber, sliceNumber) => `M${milestoneNumber.toString().padStart(2, "0")}-S${sliceNumber.toString().padStart(2, "0")}`;
export const transitionSlice = (slice, to) => {
    if (!canTransition(slice.status, to)) {
        return Err(invalidTransitionError(slice.id, slice.status, to));
    }
    const updated = { ...slice, status: to };
    const event = sliceStatusChangedEvent(slice.id, slice.status, to);
    return Ok({ slice: updated, events: [event] });
};
//# sourceMappingURL=slice.js.map