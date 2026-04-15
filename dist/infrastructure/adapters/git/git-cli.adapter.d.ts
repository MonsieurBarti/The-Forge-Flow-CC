import { type DomainError } from "../../../domain/errors/domain-error.js";
import type { GitOps } from "../../../domain/ports/git-ops.port.js";
import { type Result } from "../../../domain/result.js";
import type { CommitRef } from "../../../domain/value-objects/commit-ref.js";
export declare class GitCliAdapter implements GitOps {
    private readonly repoRoot;
    private cache;
    private readonly TTL_MS;
    constructor(repoRoot: string);
    private getCached;
    private setCache;
    invalidateCache(): void;
    createBranch(name: string, from: string): Promise<Result<void, DomainError>>;
    createWorktree(path: string, branch: string, startPoint?: string): Promise<Result<void, DomainError>>;
    deleteWorktree(path: string): Promise<Result<void, DomainError>>;
    listWorktrees(): Promise<Result<string[], DomainError>>;
    commit(message: string, files: string[], worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    revert(commitSha: string, worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    merge(source: string, target: string): Promise<Result<void, DomainError>>;
    getCurrentBranch(worktreePath?: string): Promise<Result<string, DomainError>>;
    getHeadSha(worktreePath?: string): Promise<Result<string, DomainError>>;
    createOrphanWorktree(path: string, branchName: string): Promise<Result<void, DomainError>>;
    checkoutWorktree(path: string, existingBranch: string): Promise<Result<void, DomainError>>;
    branchExists(name: string): Promise<Result<boolean, DomainError>>;
    deleteBranch(name: string): Promise<Result<void, DomainError>>;
    pruneWorktrees(): Promise<Result<void, DomainError>>;
    lsTree(ref: string): Promise<Result<string[], DomainError>>;
    extractFile(ref: string, filePath: string): Promise<Result<Buffer, DomainError>>;
    detectDefaultBranch(): Promise<Result<string, DomainError>>;
    pushBranch(branch: string, remote?: string): Promise<Result<void, DomainError>>;
    fetchBranch(branch: string, remote?: string): Promise<Result<void, DomainError>>;
}
//# sourceMappingURL=git-cli.adapter.d.ts.map