import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createDomainError, type DomainError } from '../../../domain/errors/domain-error.js';
import type { GitOps } from '../../../domain/ports/git-ops.port.js';
import { Err, Ok, type Result } from '../../../domain/result.js';
import type { CommitRef } from '../../../domain/value-objects/commit-ref.js';

const exec = promisify(execFile);
const gitError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

const runGit = async (args: string[], cwd?: string): Promise<Result<string, DomainError>> => {
  try {
    const { stdout } = await exec('git', args, { cwd, timeout: 30_000 });
    return Ok(stdout.trim());
  } catch (err) {
    return Err(gitError(`git ${args.join(' ')} failed: ${err}`, { args }));
  }
};

export class GitCliAdapter implements GitOps {
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly TTL_MS = 5000;

  constructor(private readonly repoRoot: string) {}

  private getCached(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setCache(key: string, value: string): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.TTL_MS });
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  async createBranch(name: string, from: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['branch', name, from], this.repoRoot);
    if (!r.ok) return r;
    this.invalidateCache();
    return Ok(undefined);
  }
  async createWorktree(path: string, branch: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['worktree', 'add', path, '-b', branch], this.repoRoot);
    if (!r.ok) return r;
    return Ok(undefined);
  }
  async deleteWorktree(path: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['worktree', 'remove', path, '--force'], this.repoRoot);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async listWorktrees(): Promise<Result<string[], DomainError>> {
    const r = await runGit(['worktree', 'list', '--porcelain'], this.repoRoot);
    if (!r.ok) return r;
    return Ok(
      r.data
        .split('\n')
        .filter((l) => l.startsWith('worktree '))
        .map((l) => l.replace('worktree ', '')),
    );
  }

  async commit(message: string, files: string[], worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;
    const addR = await runGit(['add', ...files], cwd);
    if (!addR.ok) return addR;
    const commitR = await runGit(['commit', '-m', message], cwd);
    if (!commitR.ok) return commitR;
    const shaR = await runGit(['rev-parse', '--short', 'HEAD'], cwd);
    if (!shaR.ok) return shaR;
    this.invalidateCache();
    return Ok({ sha: shaR.data, message });
  }

  async revert(commitSha: string, worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;
    const r = await runGit(['revert', '--no-edit', commitSha], cwd);
    if (!r.ok) return r;
    const shaR = await runGit(['rev-parse', '--short', 'HEAD'], cwd);
    if (!shaR.ok) return shaR;
    return Ok({ sha: shaR.data, message: `Revert "${commitSha}"` });
  }

  async merge(source: string, target: string): Promise<Result<void, DomainError>> {
    await runGit(['checkout', target], this.repoRoot);
    const r = await runGit(['merge', source, '--no-ff'], this.repoRoot);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async getCurrentBranch(worktreePath?: string): Promise<Result<string, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;
    const cacheKey = `branch:${cwd}`;
    const cached = this.getCached(cacheKey);
    if (cached) return Ok(cached);
    const r = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    if (r.ok) this.setCache(cacheKey, r.data);
    return r;
  }

  async getHeadSha(worktreePath?: string): Promise<Result<string, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;
    const cacheKey = `sha:${cwd}`;
    const cached = this.getCached(cacheKey);
    if (cached) return Ok(cached);
    const r = await runGit(['rev-parse', '--short', 'HEAD'], cwd);
    if (r.ok) this.setCache(cacheKey, r.data);
    return r;
  }
}
