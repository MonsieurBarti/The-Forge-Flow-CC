import { createDomainError } from "./domain-error.js";
export const stateBranchNotFoundError = (codeBranch) => createDomainError("STATE_BRANCH_NOT_FOUND", `No state branch found for code branch "${codeBranch}"`, { codeBranch });
//# sourceMappingURL=state-branch-not-found.error.js.map