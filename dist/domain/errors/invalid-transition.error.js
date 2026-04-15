import { createDomainError } from "./domain-error.js";
export const invalidTransitionError = (sliceId, from, to) => createDomainError("INVALID_TRANSITION", `Cannot transition slice "${sliceId}" from "${from}" to "${to}"`, {
    sliceId,
    from,
    to,
});
//# sourceMappingURL=invalid-transition.error.js.map