import { createDomainError } from "./domain-error.js";
export const corruptedStateError = (branch, reason) => createDomainError("CORRUPTED_STATE", `Corrupted state on branch "${branch}": ${reason}`, {
    branch,
});
//# sourceMappingURL=corrupted-state.error.js.map