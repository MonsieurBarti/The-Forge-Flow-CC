import { createDomainError } from "./domain-error.js";

export const milestoneCompletenessViolationError = (
	milestoneId: string,
	slicesMissingSpecApproval: ReadonlyArray<string>,
) =>
	createDomainError(
		"MILESTONE_COMPLETENESS_VIOLATION",
		`Milestone "${milestoneId}" cannot close — slices missing approved spec review: ${slicesMissingSpecApproval.join(", ")}`,
		{ milestoneId, slicesMissingSpecApproval },
	);
