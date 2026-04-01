import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DomainError } from '../../../domain/errors/domain-error.js';
import { syncFailedError } from '../../../domain/errors/sync-failed.error.js';
import { stateBranchNotFoundError } from '../../../domain/errors/state-branch-not-found.error.js';
import type { GitOps } from '../../../domain/ports/git-ops.port.js';
import type { StateBranchPort } from '../../../domain/ports/state-branch.port.js';
import { Err, Ok, isOk, type Result } from '../../../domain/result.js';
import type { BranchMeta } from '../../../domain/value-objects/branch-meta.js';
import type { MergeResult } from '../../../domain/value-objects/merge-result.js';
import type { RestoreResult } from '../../../domain/value-objects/restore-result.js';

const STATE_PREFIX = 'tff-state/';

export class GitStateBranchAdapter implements StateBranchPort {
  private resolvedDefaultBranch: string | undefined;

  constructor(
    private readonly gitOps: GitOps,
    private readonly repoRoot: string,
  ) {}

  private async getDefaultBranch(): Promise<string> {
    if (this.resolvedDefaultBranch) return this.resolvedDefaultBranch;
    const r = await this.gitOps.detectDefaultBranch();
    this.resolvedDefaultBranch = isOk(r) ? r.data : 'main';
    return this.resolvedDefaultBranch;
  }

  private stateBranch(codeBranch: string): string {
    return `${STATE_PREFIX}${codeBranch}`;
  }

  private tmpWorktreePath(): string {
    return path.join(tmpdir(), `tff-state-wt-${randomUUID().slice(0, 8)}`);
  }

  private writeBranchMeta(worktreePath: string, meta: BranchMeta): void {
    writeFileSync(
      path.join(worktreePath, 'branch-meta.json'),
      JSON.stringify(meta, null, 2),
    );
  }

  private writeGitignore(worktreePath: string): void {
    writeFileSync(
      path.join(worktreePath, '.gitignore'),
      '.DS_Store\nThumbs.db\n*.swp\n',
    );
  }

  async createRoot(): Promise<Result<void, DomainError>> {
    const defaultBranch = await this.getDefaultBranch();
    const rootBranch = this.stateBranch(defaultBranch);
    const existsR = await this.gitOps.branchExists(rootBranch);
    if (!isOk(existsR)) return existsR;
    if (existsR.data) {
      return Err(syncFailedError(`Root state branch "${rootBranch}" already exists`));
    }

    const tmpPath = this.tmpWorktreePath();
    mkdirSync(tmpPath, { recursive: true });
    const createR = await this.gitOps.createOrphanWorktree(tmpPath, rootBranch);
    if (!isOk(createR)) return createR;

    try {
      const meta: BranchMeta = {
        stateId: randomUUID(),
        codeBranch: defaultBranch,
        parentStateBranch: null,
        createdAt: new Date().toISOString(),
      };

      this.writeBranchMeta(tmpPath, meta);
      this.writeGitignore(tmpPath);

      const commitR = await this.gitOps.commit(
        `chore: init state branch ${rootBranch}`,
        ['branch-meta.json', '.gitignore'],
        tmpPath,
      );
      if (!isOk(commitR)) return Err(syncFailedError(`Initial commit failed: ${commitR.error.message}`));
      return Ok(undefined);
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
    }
  }

  async exists(codeBranch: string): Promise<Result<boolean, DomainError>> {
    return this.gitOps.branchExists(this.stateBranch(codeBranch));
  }

  async fork(_codeBranch: string, _parentStateBranch: string): Promise<Result<void, DomainError>> {
    throw new Error('Not implemented — see T09');
  }

  async sync(_codeBranch: string, _message: string): Promise<Result<void, DomainError>> {
    throw new Error('Not implemented — see T10');
  }

  async restore(_codeBranch: string, _targetDir: string): Promise<Result<RestoreResult | null, DomainError>> {
    throw new Error('Not implemented — see T11');
  }

  async merge(_childBranch: string, _parentBranch: string, _sliceId: string): Promise<Result<MergeResult, DomainError>> {
    throw new Error('Not implemented — see T12');
  }

  async deleteBranch(codeBranch: string): Promise<Result<void, DomainError>> {
    return this.gitOps.deleteBranch(this.stateBranch(codeBranch));
  }
}
