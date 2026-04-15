import { createDomainError, type DomainError } from "./domain-error.js";

export const alreadyClaimedError = (taskId: string): DomainError =>
	createDomainError("ALREADY_CLAIMED", `Task "${taskId}" is already claimed`, { taskId });
