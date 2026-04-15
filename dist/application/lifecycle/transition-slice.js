import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, isOk } from "../../domain/result.js";
export const transitionSliceUseCase = async (input, deps) => {
    const transitionResult = deps.sliceStore.transitionSlice(input.sliceId, input.targetStatus);
    if (!isOk(transitionResult))
        return transitionResult;
    if (deps.eventBus) {
        for (const event of transitionResult.data) {
            deps.eventBus.publish(event);
        }
    }
    const sliceResult = deps.sliceStore.getSlice(input.sliceId);
    if (!isOk(sliceResult))
        return sliceResult;
    if (!sliceResult.data) {
        return Err(createDomainError("NOT_FOUND", `Slice "${input.sliceId}" not found after transition`));
    }
    return { ok: true, data: { slice: sliceResult.data, events: transitionResult.data } };
};
//# sourceMappingURL=transition-slice.js.map