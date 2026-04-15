import { isOk, Ok } from "../../domain/result.js";
export const createWorktreeUseCase = async (input, deps) => {
    const worktreePath = `.tff/worktrees/${input.sliceId}`;
    const branchName = `slice/${input.sliceId}`;
    const result = await deps.gitOps.createWorktree(worktreePath, branchName, input.startPoint);
    if (!isOk(result))
        return result;
    return Ok({ worktreePath, branchName });
};
//# sourceMappingURL=create-worktree.js.map