import { createDomainError } from "./domain-error.js";

export const corruptedStateError = (branch: string, reason: string) =>
	createDomainError("CORRUPTED_STATE", `Corrupted state on branch "${branch}": ${reason}`, {
		branch,
	});
