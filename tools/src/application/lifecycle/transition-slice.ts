import { type Slice, transitionSlice } from '../../domain/entities/slice.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { DomainEvent } from '../../domain/events/domain-event.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import { isOk, type Result } from '../../domain/result.js';
import type { SliceStatus } from '../../domain/value-objects/slice-status.js';

interface TransitionInput {
  slice: Slice;
  beadId: string;
  targetStatus: SliceStatus;
}
interface TransitionDeps {
  beadStore: BeadStore;
}
interface TransitionOutput {
  slice: Slice;
  events: DomainEvent[];
}

export const transitionSliceUseCase = async (
  input: TransitionInput,
  deps: TransitionDeps,
): Promise<Result<TransitionOutput, DomainError>> => {
  const result = transitionSlice(input.slice, input.targetStatus);
  if (!isOk(result)) return result;
  const updateResult = await deps.beadStore.updateStatus(input.beadId, input.targetStatus);
  if (!isOk(updateResult)) return updateResult;
  return result;
};
