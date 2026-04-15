import { createDomainError } from "./domain-error.js";
export const alreadyClaimedError = (taskId) => createDomainError("ALREADY_CLAIMED", `Task "${taskId}" is already claimed`, { taskId });
//# sourceMappingURL=already-claimed.error.js.map