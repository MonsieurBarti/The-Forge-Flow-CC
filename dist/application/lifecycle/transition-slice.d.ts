import type { Slice } from "../../domain/entities/slice.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { DomainEvent } from "../../domain/events/domain-event.js";
import type { EventBus } from "../../domain/ports/event-bus.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import { type Result } from "../../domain/result.js";
import type { SliceStatus } from "../../domain/value-objects/slice-status.js";
interface TransitionInput {
    sliceId: string;
    targetStatus: SliceStatus;
}
interface TransitionDeps {
    sliceStore: SliceStore;
    eventBus?: EventBus;
}
interface TransitionOutput {
    slice: Slice;
    events: DomainEvent[];
}
export declare const transitionSliceUseCase: (input: TransitionInput, deps: TransitionDeps) => Promise<Result<TransitionOutput, DomainError>>;
export {};
//# sourceMappingURL=transition-slice.d.ts.map