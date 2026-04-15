import { createDomainError } from "./domain-error.js";

export const freshReviewerViolationError = (sliceId: string, agentRole: string) =>
	createDomainError(
		"FRESH_REVIEWER_VIOLATION",
		`Agent "${agentRole}" cannot review slice "${sliceId}" — was the executor`,
		{ sliceId, agentRole },
	);
