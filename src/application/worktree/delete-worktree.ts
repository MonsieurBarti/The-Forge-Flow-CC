import type { DomainError } from "../../domain/errors/domain-error.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { Result } from "../../domain/result.js";

interface DeleteWorktreeInput {
	sliceId: string;
}
interface DeleteWorktreeDeps {
	gitOps: GitOps;
}

export const deleteWorktreeUseCase = async (
	input: DeleteWorktreeInput,
	deps: DeleteWorktreeDeps,
): Promise<Result<void, DomainError>> => {
	const worktreePath = `.tff/worktrees/${input.sliceId}`;
	return deps.gitOps.deleteWorktree(worktreePath);
};
