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
  } catch (err: unknown) {
    // execFile errors include stdout/stderr on the error object
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const detail = e.stderr?.trim() || e.stdout?.trim() || e.message || String(err);
    return Err(gitError(`git ${args.join(' ')} failed: ${detail}`, { args }));
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

  async createOrphanWorktree(path: string, branchName: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['worktree', 'add', '--detach', path], this.repoRoot);
    if (!r.ok) return r;
    const orphanR = await runGit(['checkout', '--orphan', branchName], path);
    if (!orphanR.ok) {
      await runGit(['worktree', 'remove', path, '--force'], this.repoRoot);
      return orphanR;
    }
    await runGit(['rm', '-rf', '--cached', '.'], path);
    return Ok(undefined);
  }

  async checkoutWorktree(path: string, existingBranch: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['worktree', 'add', path, existingBranch], this.repoRoot);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async branchExists(name: string): Promise<Result<boolean, DomainError>> {
    const r = await runGit(['rev-parse', '--verify', `refs/heads/${name}`], this.repoRoot);
    return Ok(r.ok);
  }

  async deleteBranch(name: string): Promise<Result<void, DomainError>> {
    const r = await runGit(['branch', '-D', name], this.repoRoot);
    if (!r.ok) return r;
    this.invalidateCache();
    return Ok(undefined);
  }

  async pruneWorktrees(): Promise<Result<void, DomainError>> {
    const r = await runGit(['worktree', 'prune'], this.repoRoot);
    if (!r.ok) return r;
    return Ok(undefined);
  }

  async lsTree(ref: string): Promise<Result<string[], DomainError>> {
    const r = await runGit(['ls-tree', '-r', '--name-only', ref], this.repoRoot);
    if (!r.ok) return r;
    return Ok(r.data.split('\n').filter(Boolean));
  }

  async extractFile(ref: string, filePath: string): Promise<Result<Buffer, DomainError>> {
    // CRITICAL: Cannot use runGit — it calls stdout.trim() which corrupts binary data.
    // Use raw execFile with encoding: 'buffer' for binary-safe extraction.
    const { execFile: execFileRaw } = await import('node:child_process');
    return new Promise((resolve) => {
      execFileRaw(
        'git',
        ['show', `${ref}:${filePath}`],
        {
          cwd: this.repoRoot,
          timeout: 30_000,
          encoding: 'buffer',
          maxBuffer: 10 * 1024 * 1024,
        },
        (err, stdout) => {
          if (err) {
            resolve(Err(gitError(`git show ${ref}:${filePath} failed: ${err}`, { ref, filePath })));
          } else {
            resolve(Ok(stdout as unknown as Buffer));
          }
        },
      );
    });
  }

  async detectDefaultBranch(): Promise<Result<string, DomainError>> {
    const originR = await runGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], this.repoRoot);
    if (originR.ok) {
      const ref = originR.data.replace('refs/remotes/origin/', '');
      if (ref) return Ok(ref);
    }
    const configR = await runGit(['config', 'init.defaultBranch'], this.repoRoot);
    if (configR.ok && configR.data) return Ok(configR.data);
    return Ok('main');
  }
}
