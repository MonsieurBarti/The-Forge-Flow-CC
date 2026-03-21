import { z } from 'zod';
import { type Result, Ok, Err } from '../result.js';
import { SliceStatusSchema, canTransition, type SliceStatus } from '../value-objects/slice-status.js';
import { ComplexityTierSchema } from '../value-objects/complexity-tier.js';
import { type DomainError } from '../errors/domain-error.js';
import { invalidTransitionError } from '../errors/invalid-transition.error.js';
import { sliceStatusChangedEvent } from '../events/slice-status-changed.event.js';
import { type DomainEvent } from '../events/domain-event.js';

export const SliceSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
  name: z.string().min(1),
  sliceId: z.string(),
  status: SliceStatusSchema,
  tier: ComplexityTierSchema.optional(),
  createdAt: z.date(),
});

export type Slice = z.infer<typeof SliceSchema>;

export const createSlice = (input: {
  milestoneId: string;
  name: string;
  milestoneNumber: number;
  sliceNumber: number;
}): Slice => {
  const slice = {
    id: crypto.randomUUID(),
    milestoneId: input.milestoneId,
    name: input.name,
    sliceId: formatSliceId(input.milestoneNumber, input.sliceNumber),
    status: 'discussing' as const,
    createdAt: new Date(),
  };
  return SliceSchema.parse(slice);
};

export const formatSliceId = (milestoneNumber: number, sliceNumber: number): string =>
  `M${milestoneNumber.toString().padStart(2, '0')}-S${sliceNumber.toString().padStart(2, '0')}`;

export const transitionSlice = (
  slice: Slice,
  to: SliceStatus,
): Result<{ slice: Slice; events: DomainEvent[] }, DomainError> => {
  if (!canTransition(slice.status, to)) {
    return Err(invalidTransitionError(slice.sliceId, slice.status, to));
  }

  const updated: Slice = { ...slice, status: to };
  const event = sliceStatusChangedEvent(slice.sliceId, slice.status, to);

  return Ok({ slice: updated, events: [event] });
};
