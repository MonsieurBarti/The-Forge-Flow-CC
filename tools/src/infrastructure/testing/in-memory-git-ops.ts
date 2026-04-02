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
  private treeFiles = new Map<string, string[]>();
  private fileContents = new Map<string, Buffer>();

  async createBranch(name: string, _from: string): Promise<Result<void, DomainError>> {
    this.branches.add(name);
    return Ok(undefined);
  }

  async createWorktree(path: string, branch: string, _startPoint?: string): Promise<Result<void, DomainError>> {
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

  async createOrphanWorktree(path: string, branchName: string): Promise<Result<void, DomainError>> {
    this.branches.add(branchName);
    this.worktrees.set(path, branchName);
    return Ok(undefined);
  }

  async checkoutWorktree(path: string, existingBranch: string): Promise<Result<void, DomainError>> {
    if (!this.branches.has(existingBranch))
      return Err(createDomainError('NOT_FOUND', `Branch not found: ${existingBranch}`, { existingBranch }));
    this.worktrees.set(path, existingBranch);
    return Ok(undefined);
  }

  async branchExists(name: string): Promise<Result<boolean, DomainError>> {
    return Ok(this.branches.has(name));
  }

  async deleteBranch(name: string): Promise<Result<void, DomainError>> {
    this.branches.delete(name);
    return Ok(undefined);
  }

  async pruneWorktrees(): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }

  async lsTree(ref: string): Promise<Result<string[], DomainError>> {
    return Ok(this.treeFiles.get(ref) ?? []);
  }

  async extractFile(ref: string, filePath: string): Promise<Result<Buffer, DomainError>> {
    const key = `${ref}:${filePath}`;
    const buf = this.fileContents.get(key);
    if (!buf) return Err(createDomainError('NOT_FOUND', `File not found: ${key}`, { ref, filePath }));
    return Ok(buf);
  }

  async detectDefaultBranch(): Promise<Result<string, DomainError>> {
    return Ok('main');
  }

  reset(): void {
    this.branches = new Set(['main']);
    this.worktrees.clear();
    this.currentBranch = 'main';
    this.commits = [];
    this.headSha = 'abc1234';
    this.treeFiles.clear();
    this.fileContents.clear();
  }
  getCommits(): CommitRef[] {
    return [...this.commits];
  }
  hasBranch(name: string): boolean {
    return this.branches.has(name);
  }

  setTreeFiles(ref: string, files: string[]): void {
    this.treeFiles.set(ref, files);
  }

  setFileContent(ref: string, filePath: string, content: Buffer): void {
    this.fileContents.set(`${ref}:${filePath}`, content);
  }
}
