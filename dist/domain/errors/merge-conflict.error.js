import { createDomainError } from "./domain-error.js";
export const mergeConflictError = (childBranch, parentBranch, reason) => createDomainError("MERGE_CONFLICT", `Merge conflict: ${childBranch} -> ${parentBranch}: ${reason}`, {
    childBranch,
    parentBranch,
});
//# sourceMappingURL=merge-conflict.error.js.map