import type { DomainError } from "../../domain/errors/domain-error.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import type { Result } from "../../domain/result.js";

interface ForkBranchInput {
	codeBranch: string;
	parentStateBranch: string;
}
interface ForkBranchDeps {
	stateBranch: StateBranchPort;
}

export const forkBranchUseCase = async (
	input: ForkBranchInput,
	deps: ForkBranchDeps,
): Promise<Result<void, DomainError>> =>
	deps.stateBranch.fork(input.codeBranch, input.parentStateBranch);
