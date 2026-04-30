/**
 * Resolvers that derive runtime values (base branch, branch name) from a slice
 * with a possible parent milestone. These centralize the "milestone-bound vs
 * ad-hoc" branching so callers (worktree-create, ship, judge) don't repeat it.
 */

import { sliceBranchName } from "./branch-naming.js";

export const resolveBaseBranch = (
	slice: { id: string; baseBranch?: string },
	milestone?: { branch?: string },
): string => {
	if (slice.baseBranch) return slice.baseBranch;
	if (milestone?.branch) return milestone.branch;
	throw new Error(
		`resolveBaseBranch: slice ${slice.id} has no base_branch and no parent milestone branch`,
	);
};

export const resolveBranchName = (slice: { id: string; branchName?: string }): string => {
	return slice.branchName ?? sliceBranchName(slice.id);
};
