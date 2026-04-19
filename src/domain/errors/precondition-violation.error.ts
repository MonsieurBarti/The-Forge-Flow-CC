import { createDomainError, type DomainError } from "./domain-error.js";

export interface PreconditionViolation {
	code: string;
	expected: unknown;
	actual: unknown;
}

export const preconditionViolationError = (violations: PreconditionViolation[]): DomainError =>
	createDomainError(
		"PRECONDITION_VIOLATION",
		`Precondition violated: ${violations.map((v) => v.code).join(", ")}`,
		{ violations },
	);
