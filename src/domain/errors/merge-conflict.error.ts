import { createDomainError } from "./domain-error.js";

export const mergeConflictError = (childBranch: string, parentBranch: string, reason: string) =>
	createDomainError(
		"MERGE_CONFLICT",
		`Merge conflict: ${childBranch} -> ${parentBranch}: ${reason}`,
		{
			childBranch,
			parentBranch,
		},
	);
