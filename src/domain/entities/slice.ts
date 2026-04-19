import { z } from "zod";
import type { DomainError } from "../errors/domain-error.js";
import { invalidTransitionError } from "../errors/invalid-transition.error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { sliceStatusChangedEvent } from "../events/slice-status-changed.event.js";
import { sliceLabel as sliceLabelHelper } from "../helpers/branch-naming.js";
import { Err, Ok, type Result } from "../result.js";
import { ComplexityTierSchema } from "../value-objects/complexity-tier.js";
import {
	canTransition,
	type SliceStatus,
	SliceStatusSchema,
} from "../value-objects/slice-status.js";

export const SliceSchema = z.object({
	id: z.string().min(1),
	milestoneId: z.string().min(1),
	number: z.number().int().min(1),
	title: z.string().min(1),
	status: SliceStatusSchema,
	tier: ComplexityTierSchema.optional(),
	createdAt: z.date(),
});

export type Slice = z.infer<typeof SliceSchema>;

/**
 * Generate a random UUID v4
 */
const generateUuid = (): string => {
	return crypto.randomUUID();
};

export const createSlice = (input: {
	milestoneId: string;
	title: string;
	milestoneNumber: number;
	sliceNumber: number;
}): Slice => {
	const slice = {
		id: generateUuid(),
		milestoneId: input.milestoneId,
		number: input.sliceNumber,
		title: input.title,
		status: "discussing" as const,
		createdAt: new Date(),
	};
	return SliceSchema.parse(slice);
};

/**
 * Format a slice number as a human-readable label (M##-S##).
 * Re-exported from branch-naming helper for convenience.
 */
export const sliceLabel = (milestoneNumber: number, sliceNumber: number): string => {
	return sliceLabelHelper(milestoneNumber, sliceNumber);
};

/**
 * Apply a transition on a Slice aggregate. Delegates the legality check to
 * {@link canTransition} from `../value-objects/slice-status.ts` — the
 * canonical edge table lives there. This function's job is the aggregate-level
 * wiring: emit a domain event on success, return the invalid-transition error
 * on refusal.
 */
export const transitionSlice = (
	slice: Slice,
	to: SliceStatus,
): Result<{ slice: Slice; events: DomainEvent[] }, DomainError> => {
	if (!canTransition(slice.status, to)) {
		return Err(invalidTransitionError(slice.id, slice.status, to));
	}

	const updated: Slice = { ...slice, status: to };
	const event = sliceStatusChangedEvent(slice.id, slice.status, to);

	return Ok({ slice: updated, events: [event] });
};
