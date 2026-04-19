import { createDomainError, type DomainError } from "./domain-error.js";

export type PreconditionViolationValue = string | number | boolean | null;

export interface PreconditionViolation {
	code: string;
	expected: PreconditionViolationValue;
	actual: PreconditionViolationValue;
}

export const preconditionViolationError = (violations: PreconditionViolation[]): DomainError => {
	const detail = violations.length > 0 ? violations.map((v) => v.code).join(", ") : "no details";
	return createDomainError("PRECONDITION_VIOLATION", `Precondition violated: ${detail}`, {
		violations,
	});
};
