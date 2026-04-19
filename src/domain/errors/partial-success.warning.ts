import { createDomainError, type DomainError } from "./domain-error.js";

/**
 * PartialSuccessWarning is a DomainError with code PARTIAL_SUCCESS used in the
 * `warnings: DomainError[]` array of a successful result. It is never thrown.
 */
export const partialSuccessWarning = (message: string, pendingEffect: string): DomainError =>
	createDomainError("PARTIAL_SUCCESS", message, { pendingEffect });
