import { createDomainError, type DomainError } from "./domain-error.js";

export const refusedOnDefaultBranchError = (command: string, branch: string): DomainError =>
	createDomainError(
		"REFUSED_ON_DEFAULT_BRANCH",
		`Refusing to run "${command}" on default branch "${branch}". Create a worktree before proceeding.`,
		{ command, branch },
	);
