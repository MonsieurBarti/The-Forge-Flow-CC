import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { CommitRef } from "../value-objects/commit-ref.js";
export interface GitOps {
    createBranch(name: string, from: string): Promise<Result<void, DomainError>>;
    createWorktree(path: string, branch: string, startPoint?: string): Promise<Result<void, DomainError>>;
    deleteWorktree(path: string): Promise<Result<void, DomainError>>;
    listWorktrees(): Promise<Result<string[], DomainError>>;
    commit(message: string, files: string[], worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    revert(commitSha: string, worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    merge(source: string, target: string): Promise<Result<void, DomainError>>;
    getCurrentBranch(worktreePath?: string): Promise<Result<string, DomainError>>;
    getHeadSha(worktreePath?: string): Promise<Result<string, DomainError>>;
    /** Create a TRUE orphan branch in a worktree (no shared history with any branch). */
    createOrphanWorktree(path: string, branchName: string): Promise<Result<void, DomainError>>;
    checkoutWorktree(path: string, existingBranch: string): Promise<Result<void, DomainError>>;
    branchExists(name: string): Promise<Result<boolean, DomainError>>;
    deleteBranch(name: string): Promise<Result<void, DomainError>>;
    pruneWorktrees(): Promise<Result<void, DomainError>>;
    lsTree(ref: string): Promise<Result<string[], DomainError>>;
    extractFile(ref: string, filePath: string): Promise<Result<Buffer, DomainError>>;
    /** Detect the default branch name: origin/HEAD -> git config -> 'main' fallback. */
    detectDefaultBranch(): Promise<Result<string, DomainError>>;
    /** Push a branch to remote (best-effort — non-blocking if no remote). */
    pushBranch(branch: string, remote?: string): Promise<Result<void, DomainError>>;
    /** Fetch a specific branch from remote into local refs (best-effort). */
    fetchBranch(branch: string, remote?: string): Promise<Result<void, DomainError>>;
}
//# sourceMappingURL=git-ops.port.d.ts.map