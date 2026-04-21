import { createDomainError } from "./domain-error.js";

export const shipCompletenessViolationError = (
	sliceId: string,
	missingTypes: ReadonlyArray<"code" | "security">,
) =>
	createDomainError(
		"SHIP_COMPLETENESS_VIOLATION",
		`Slice "${sliceId}" cannot close — missing approved review(s) of type: ${missingTypes.join(", ")}`,
		{ sliceId, missingTypes },
	);
