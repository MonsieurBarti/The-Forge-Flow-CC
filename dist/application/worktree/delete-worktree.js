export const deleteWorktreeUseCase = async (input, deps) => {
    const worktreePath = `.tff/worktrees/${input.sliceId}`;
    return deps.gitOps.deleteWorktree(worktreePath);
};
//# sourceMappingURL=delete-worktree.js.map