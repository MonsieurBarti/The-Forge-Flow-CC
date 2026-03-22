import { createDomainError, type DomainError } from '../../domain/errors/domain-error.js';
import type { GitOps } from '../../domain/ports/git-ops.port.js';
import { Err, Ok, type Result } from '../../domain/result.js';
import type { CommitRef } from '../../domain/value-objects/commit-ref.js';

export class InMemoryGitOps implements GitOps {
  private branches = new Set<string>(['main']);
  private worktrees = new Map<string, string>();
  private currentBranch = 'main';
  private commits: CommitRef[] = [];
  private headSha = 'abc1234';

  async createBranch(name: string, _from: string): Promise<Result<void, DomainError>> {
    this.branches.add(name);
    return Ok(undefined);
  }

  async createWorktree(path: string, branch: string): Promise<Result<void, DomainError>> {
    this.worktrees.set(path, branch);
    this.branches.add(branch);
    return Ok(undefined);
  }

  async deleteWorktree(path: string): Promise<Result<void, DomainError>> {
    if (!this.worktrees.has(path)) return Err(createDomainError('NOT_FOUND', `Worktree not found: ${path}`, { path }));
    this.worktrees.delete(path);
    return Ok(undefined);
  }

  async listWorktrees(): Promise<Result<string[], DomainError>> {
    return Ok([...this.worktrees.keys()]);
  }

  async commit(message: string, _files: string[], _worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const sha = Math.random().toString(16).slice(2, 9);
    const ref: CommitRef = { sha, message };
    this.commits.push(ref);
    this.headSha = sha;
    return Ok(ref);
  }

  async revert(commitSha: string, _worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const sha = Math.random().toString(16).slice(2, 9);
    const ref: CommitRef = { sha, message: `Revert "${commitSha}"` };
    this.commits.push(ref);
    this.headSha = sha;
    return Ok(ref);
  }

  async merge(_source: string, _target: string): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }
  async getCurrentBranch(_worktreePath?: string): Promise<Result<string, DomainError>> {
    return Ok(this.currentBranch);
  }
  async getHeadSha(_worktreePath?: string): Promise<Result<string, DomainError>> {
    return Ok(this.headSha);
  }

  reset(): void {
    this.branches = new Set(['main']);
    this.worktrees.clear();
    this.currentBranch = 'main';
    this.commits = [];
    this.headSha = 'abc1234';
  }
  getCommits(): CommitRef[] {
    return [...this.commits];
  }
  hasBranch(name: string): boolean {
    return this.branches.has(name);
  }
}
