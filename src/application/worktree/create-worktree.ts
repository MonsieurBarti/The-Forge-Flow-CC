import type { Slice } from "../../domain/entities/slice.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { sliceBranchName, sliceLabel } from "../../domain/helpers/branch-naming.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";

interface CreateWorktreeInput {
	slice: Slice;
	milestoneNumber: number;
	startPoint?: string;
}
interface CreateWorktreeDeps {
	gitOps: GitOps;
}
interface CreateWorktreeOutput {
	worktreePath: string;
	branchName: string;
}

export const createWorktreeUseCase = async (
	input: CreateWorktreeInput,
	deps: CreateWorktreeDeps,
): Promise<Result<CreateWorktreeOutput, DomainError>> => {
	// Branch name uses 8-char UUID prefix from slice.id
	const branchName = sliceBranchName(input.slice.id);

	// Worktree path uses human-readable label format
	const label = sliceLabel(input.milestoneNumber, input.slice.number);
	const worktreePath = `.tff-cc/worktrees/${label}`;

	const result = await deps.gitOps.createWorktree(worktreePath, branchName, input.startPoint);
	if (!isOk(result)) return result;

	return Ok({ worktreePath, branchName });
};
