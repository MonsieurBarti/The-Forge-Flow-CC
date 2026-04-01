import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { MergeResult } from '../value-objects/merge-result.js';
import type { RestoreResult } from '../value-objects/restore-result.js';

export interface StateBranchPort {
  /** Create root orphan state branch (tff-state/<default>) with initial commit. */
  createRoot(): Promise<Result<void, DomainError>>;

  /** Fork child state branch from parent. */
  fork(codeBranch: string, parentStateBranch: string): Promise<Result<void, DomainError>>;

  /** Sync .tff/ to state branch (WAL checkpoint + copy + commit). */
  sync(codeBranch: string, message: string): Promise<Result<void, DomainError>>;

  /** Restore .tff/ from state branch (binary-safe extraction). */
  restore(codeBranch: string, targetDir: string): Promise<Result<RestoreResult | null, DomainError>>;

  /** Merge child state into parent (entity-level SQL + artifact copy). */
  merge(
    childBranch: string,
    parentBranch: string,
    sliceId: string,
  ): Promise<Result<MergeResult, DomainError>>;

  /** Delete state branch (after successful merge). */
  deleteBranch(stateBranch: string): Promise<Result<void, DomainError>>;

  /** Check if state branch exists. */
  exists(codeBranch: string): Promise<Result<boolean, DomainError>>;
}
