import type { Milestone } from "../../domain/entities/milestone.js";
import type { Slice } from "../../domain/entities/slice.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { sliceLabelFor } from "../../domain/helpers/branch-naming.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";
import { worktreeDir } from "../../shared/paths.js";

interface CreateWorktreeInput {
	slice: Slice;
	milestone?: Milestone;
	startPoint: string;
	branchName: string;
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
	const { slice, milestone, startPoint, branchName } = input;

	// Worktree path uses human-readable label format (M##-S## | Q-## | D-##).
	const label = sliceLabelFor(slice, milestone);
	const worktreePath = worktreeDir(label);

	const result = await deps.gitOps.createWorktree(worktreePath, branchName, startPoint);
	if (!isOk(result)) return result;

	return Ok({ worktreePath, branchName });
};
