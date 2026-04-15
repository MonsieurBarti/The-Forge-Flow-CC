import { type DomainError } from "../../domain/errors/domain-error.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { type Result } from "../../domain/result.js";
import type { CommitRef } from "../../domain/value-objects/commit-ref.js";
export declare class InMemoryGitOps implements GitOps {
    private branches;
    private worktrees;
    private currentBranch;
    private commits;
    private headSha;
    private treeFiles;
    private fileContents;
    createBranch(name: string, _from: string): Promise<Result<void, DomainError>>;
    createWorktree(path: string, branch: string, _startPoint?: string): Promise<Result<void, DomainError>>;
    deleteWorktree(path: string): Promise<Result<void, DomainError>>;
    listWorktrees(): Promise<Result<string[], DomainError>>;
    commit(message: string, _files: string[], _worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    revert(commitSha: string, _worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
    merge(_source: string, _target: string): Promise<Result<void, DomainError>>;
    getCurrentBranch(_worktreePath?: string): Promise<Result<string, DomainError>>;
    getHeadSha(_worktreePath?: string): Promise<Result<string, DomainError>>;
    createOrphanWorktree(path: string, branchName: string): Promise<Result<void, DomainError>>;
    checkoutWorktree(path: string, existingBranch: string): Promise<Result<void, DomainError>>;
    branchExists(name: string): Promise<Result<boolean, DomainError>>;
    deleteBranch(name: string): Promise<Result<void, DomainError>>;
    pruneWorktrees(): Promise<Result<void, DomainError>>;
    lsTree(ref: string): Promise<Result<string[], DomainError>>;
    extractFile(ref: string, filePath: string): Promise<Result<Buffer, DomainError>>;
    detectDefaultBranch(): Promise<Result<string, DomainError>>;
    pushBranch(_branch: string, _remote?: string): Promise<Result<void, DomainError>>;
    fetchBranch(_branch: string, _remote?: string): Promise<Result<void, DomainError>>;
    reset(): void;
    getCommits(): CommitRef[];
    hasBranch(name: string): boolean;
    setTreeFiles(ref: string, files: string[]): void;
    setFileContent(ref: string, filePath: string, content: Buffer): void;
}
//# sourceMappingURL=in-memory-git-ops.d.ts.map