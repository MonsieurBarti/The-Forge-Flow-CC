import type { DomainError } from "../../domain/errors/domain-error.js";
import { refusedOnDefaultBranchError } from "../../domain/errors/refused-on-default-branch.error.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { Err, Ok, type Result } from "../../domain/result.js";

export const assertNotOnDefaultBranch = async (
	git: GitOps,
	command: string,
): Promise<Result<void, DomainError>> => {
	const currentR = await git.getCurrentBranch();
	if (!currentR.ok) return currentR;

	const defaultR = await git.detectDefaultBranch();
	if (!defaultR.ok) return defaultR;

	if (currentR.data === defaultR.data) {
		return Err(refusedOnDefaultBranchError(command, currentR.data));
	}

	return Ok(undefined);
};
