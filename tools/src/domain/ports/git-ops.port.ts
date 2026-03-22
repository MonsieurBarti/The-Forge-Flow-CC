import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { CommitRef } from '../value-objects/commit-ref.js';

export interface GitOps {
  createBranch(name: string, from: string): Promise<Result<void, DomainError>>;
  createWorktree(path: string, branch: string): Promise<Result<void, DomainError>>;
  deleteWorktree(path: string): Promise<Result<void, DomainError>>;
  listWorktrees(): Promise<Result<string[], DomainError>>;
  commit(message: string, files: string[], worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
  revert(commitSha: string, worktreePath?: string): Promise<Result<CommitRef, DomainError>>;
  merge(source: string, target: string): Promise<Result<void, DomainError>>;
  getCurrentBranch(worktreePath?: string): Promise<Result<string, DomainError>>;
  getHeadSha(worktreePath?: string): Promise<Result<string, DomainError>>;
}
