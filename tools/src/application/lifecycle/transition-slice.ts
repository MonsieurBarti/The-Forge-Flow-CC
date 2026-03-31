import type { Slice } from '../../domain/entities/slice.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { DomainEvent } from '../../domain/events/domain-event.js';
import type { SliceStore } from '../../domain/ports/slice-store.port.js';
import { Err, isOk, type Result } from '../../domain/result.js';
import { createDomainError } from '../../domain/errors/domain-error.js';
import type { SliceStatus } from '../../domain/value-objects/slice-status.js';

interface TransitionInput {
  sliceId: string;
  targetStatus: SliceStatus;
}
interface TransitionDeps {
  sliceStore: SliceStore;
}
interface TransitionOutput {
  slice: Slice;
  events: DomainEvent[];
}

export const transitionSliceUseCase = async (
  input: TransitionInput,
  deps: TransitionDeps,
): Promise<Result<TransitionOutput, DomainError>> => {
  const transitionResult = deps.sliceStore.transitionSlice(input.sliceId, input.targetStatus);
  if (!isOk(transitionResult)) return transitionResult;

  const sliceResult = deps.sliceStore.getSlice(input.sliceId);
  if (!isOk(sliceResult)) return sliceResult;
  if (!sliceResult.data) {
    return Err(createDomainError('NOT_FOUND', `Slice "${input.sliceId}" not found after transition`));
  }

  return { ok: true, data: { slice: sliceResult.data, events: transitionResult.data } };
};
