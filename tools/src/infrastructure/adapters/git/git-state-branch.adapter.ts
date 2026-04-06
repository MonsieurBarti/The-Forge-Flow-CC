import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mergeStateDbs } from '../../../application/state-branch/merge-state-dbs.js';
import type { DomainError } from '../../../domain/errors/domain-error.js';
import { stateBranchNotFoundError } from '../../../domain/errors/state-branch-not-found.error.js';
import { syncFailedError } from '../../../domain/errors/sync-failed.error.js';
import type { GitOps } from '../../../domain/ports/git-ops.port.js';
import type { StateBranchPort } from '../../../domain/ports/state-branch.port.js';
import { Err, isOk, Ok, type Result } from '../../../domain/result.js';
import type { BranchMeta } from '../../../domain/value-objects/branch-meta.js';
import type { MergeResult } from '../../../domain/value-objects/merge-result.js';
import type { RestoreResult } from '../../../domain/value-objects/restore-result.js';
import { copyTffToWorktree } from './copy-tff-to-worktree.js';
import type { StateExporter } from '../../../domain/ports/state-exporter.port.js';

const STATE_PREFIX = 'tff-state/';

export class GitStateBranchAdapter implements StateBranchPort {
  private resolvedDefaultBranch: string | undefined;

  constructor(
    private readonly gitOps: GitOps,
    private readonly repoRoot: string,
    private readonly exporter?: StateExporter,
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
    writeFileSync(path.join(worktreePath, 'branch-meta.json'), JSON.stringify(meta, null, 2));
  }

  private writeGitignore(worktreePath: string): void {
    writeFileSync(path.join(worktreePath, '.gitignore'), '.DS_Store\nThumbs.db\n*.swp\n');
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
      // Push best-effort — non-blocking if no remote
      await this.gitOps.pushBranch(rootBranch).catch(() => undefined);
      return Ok(undefined);
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
    }
  }

  async exists(codeBranch: string): Promise<Result<boolean, DomainError>> {
    return this.gitOps.branchExists(this.stateBranch(codeBranch));
  }

  async fork(codeBranch: string, parentStateBranch: string): Promise<Result<void, DomainError>> {
    const parentExistsR = await this.gitOps.branchExists(parentStateBranch);
    if (!isOk(parentExistsR)) return parentExistsR;
    if (!parentExistsR.data) {
      return Err(stateBranchNotFoundError(parentStateBranch));
    }

    const childBranch = this.stateBranch(codeBranch);
    const createR = await this.gitOps.createBranch(childBranch, parentStateBranch);
    if (!isOk(createR)) return createR;

    const tmpPath = this.tmpWorktreePath();
    mkdirSync(tmpPath, { recursive: true });
    const wtR = await this.gitOps.checkoutWorktree(tmpPath, childBranch);
    if (!isOk(wtR)) return wtR;

    try {
      const meta: BranchMeta = {
        stateId: randomUUID(),
        codeBranch,
        parentStateBranch,
        createdAt: new Date().toISOString(),
      };

      this.writeBranchMeta(tmpPath, meta);

      const commitR = await this.gitOps.commit(
        `chore: fork state branch for ${codeBranch}`,
        ['branch-meta.json'],
        tmpPath,
      );
      if (!isOk(commitR)) return Err(syncFailedError(`Fork commit failed: ${commitR.error.message}`));
      // Push best-effort — non-blocking if no remote
      await this.gitOps.pushBranch(childBranch).catch(() => undefined);
      return Ok(undefined);
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
    }
  }

  async sync(codeBranch: string, message: string): Promise<Result<void, DomainError>> {
    const stateBr = this.stateBranch(codeBranch);
    const existsR = await this.gitOps.branchExists(stateBr);
    if (!isOk(existsR)) return existsR;
    if (!existsR.data) {
      return Err(stateBranchNotFoundError(codeBranch));
    }

    await this.gitOps.pruneWorktrees();

    const tmpPath = this.tmpWorktreePath();
    mkdirSync(tmpPath, { recursive: true });
    const wtR = await this.gitOps.checkoutWorktree(tmpPath, stateBr);
    if (!isOk(wtR)) return wtR;

    try {
      const tffDir = path.join(this.repoRoot, '.tff');
      
      // S01: Export state to JSON for human-readable state branches (state-snapshot.json).
      // This is the new S01 pattern: SQLite remains local source-of-truth, but
      // state branches receive state-snapshot.json + text files instead of binary state.db.
      // S03 will extend this to merge() when implementing JSON-based state merging.
      if (this.exporter) {
        const exportResult = this.exporter.export();
        if (!isOk(exportResult)) return exportResult;
        const snapshotPath = path.join(tmpPath, '.tff', 'state-snapshot.json');
        mkdirSync(path.dirname(snapshotPath), { recursive: true });
        writeFileSync(snapshotPath, JSON.stringify(exportResult.data, null, 2));
      }
      
      copyTffToWorktree(tffDir, tmpPath);

      const commitR = await this.gitOps.commit(message, ['-A'], tmpPath);
      if (!isOk(commitR)) {
        if (commitR.error.message.includes('nothing to commit')) return Ok(undefined);
        return Err(syncFailedError(`Sync commit failed: ${commitR.error.message}`));
      }
      // Push best-effort — non-blocking if no remote
      await this.gitOps.pushBranch(stateBr).catch(() => undefined);
      return Ok(undefined);
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
    }
  }

  async restore(codeBranch: string, targetDir: string): Promise<Result<RestoreResult | null, DomainError>> {
    const stateBr = this.stateBranch(codeBranch);
    const existsR = await this.gitOps.branchExists(stateBr);
    if (!isOk(existsR)) return existsR;
    if (!existsR.data) return Ok(null);

    const filesR = await this.gitOps.lsTree(stateBr);
    if (!isOk(filesR)) return filesR;

    let filesRestored = 0;
    const resolvedTargetDir = path.resolve(targetDir);
    for (const filePath of filesR.data) {
      if (!filePath.startsWith('.tff/')) continue; // only restore .tff/ files, not root-level state artifacts
      const destPath = path.join(targetDir, filePath);
      const resolved = path.resolve(destPath);
      if (!resolved.startsWith(resolvedTargetDir + path.sep) && resolved !== resolvedTargetDir) {
        continue; // skip path traversal attempt
      }
      const bufR = await this.gitOps.extractFile(stateBr, filePath);
      if (!isOk(bufR)) continue;
      mkdirSync(path.dirname(destPath), { recursive: true });
      writeFileSync(destPath, bufR.data);
      filesRestored++;
    }

    return Ok({ filesRestored, schemaVersion: 0 });
  }

  async merge(
    childCodeBranch: string,
    parentCodeBranch: string,
    sliceId: string,
  ): Promise<Result<MergeResult, DomainError>> {
    const childStateBr = this.stateBranch(childCodeBranch);
    const parentStateBr = this.stateBranch(parentCodeBranch);

    const childExistsR = await this.gitOps.branchExists(childStateBr);
    if (!isOk(childExistsR)) return childExistsR;
    if (!childExistsR.data) {
      return Err(stateBranchNotFoundError(childCodeBranch));
    }

    // S03 TODO: Currently expects binary state.db extraction for SQL merge.
    // S01 exports JSON (state-snapshot.json) to state branches, but merge() still
    // extracts binary DB from the state branch. This creates a boundary issue:
    // S01 puts JSON in state branches, S03 will need JSON-based state extraction
    // and merge logic (instead of binary DB extraction + SQL-level merge).
    // The extraction below will fail on S01-generated branches until S03 updates
    // merge() to work with state-snapshot.json or perform reconstruction.

    // Step 1: Extract both DBs to temp directory for SQL merge
    const tmpMergeDir = path.join(tmpdir(), `tff-merge-${randomUUID().slice(0, 8)}`);
    mkdirSync(tmpMergeDir, { recursive: true });
    const parentDbPath = path.join(tmpMergeDir, 'parent.db');
    const childDbPath = path.join(tmpMergeDir, 'child.db');

    const parentDbR = await this.gitOps.extractFile(parentStateBr, '.tff/state.db');
    if (!isOk(parentDbR)) return Err(syncFailedError('Failed to extract parent DB'));
    writeFileSync(parentDbPath, parentDbR.data);

    const childDbR = await this.gitOps.extractFile(childStateBr, '.tff/state.db');
    if (!isOk(childDbR)) return Err(syncFailedError('Failed to extract child DB'));
    writeFileSync(childDbPath, childDbR.data);

    // Step 2: Entity-level SQL merge via ATTACH (AC8)
    const sqlMergeR = mergeStateDbs(parentDbPath, childDbPath, sliceId);
    if (!sqlMergeR.ok) return sqlMergeR;

    // Step 3: Checkout parent worktree, copy merged DB + child artifacts
    const tmpPath = this.tmpWorktreePath();
    mkdirSync(tmpPath, { recursive: true });
    const wtR = await this.gitOps.checkoutWorktree(tmpPath, parentStateBr);
    if (!isOk(wtR)) return wtR;

    try {
      // Copy merged DB into parent worktree
      const destDb = path.join(tmpPath, '.tff', 'state.db');
      mkdirSync(path.dirname(destDb), { recursive: true });
      cpSync(parentDbPath, destDb);

      // Step 4: Artifact merge — copy child's slice-scoped files to parent (AC9)
      let artifactsCopied = 0;
      const childFilesR = await this.gitOps.lsTree(childStateBr);
      if (isOk(childFilesR)) {
        // Derive the slice directory pattern from sliceId (e.g., "M01-S01" → milestones/M01/slices/M01-S01/)
        const milestoneId = sliceId.split('-')[0]; // "M01"
        const sliceArtifactPrefix = `.tff/milestones/${milestoneId}/slices/${sliceId}/`;

        const resolvedTmpPath = path.resolve(tmpPath);
        for (const filePath of childFilesR.data) {
          if (!filePath.startsWith(sliceArtifactPrefix)) continue;
          const destPath = path.join(tmpPath, filePath);
          const resolved = path.resolve(destPath);
          if (!resolved.startsWith(resolvedTmpPath + path.sep) && resolved !== resolvedTmpPath) {
            continue; // skip path traversal attempt
          }
          const bufR = await this.gitOps.extractFile(childStateBr, filePath);
          if (!isOk(bufR)) continue;
          mkdirSync(path.dirname(destPath), { recursive: true });
          writeFileSync(destPath, bufR.data);
          artifactsCopied++;
        }
      }

      const commitR = await this.gitOps.commit(
        `chore: merge state from ${childCodeBranch} (slice: ${sliceId})`,
        ['-A'],
        tmpPath,
      );
      if (!isOk(commitR) && !commitR.error.message.includes('nothing to commit')) {
        return Err(syncFailedError(`Merge commit failed: ${commitR.error.message}`));
      }
      return Ok({ entitiesMerged: sqlMergeR.data.entitiesMerged, artifactsCopied });
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
      try {
        rmSync(tmpMergeDir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
  }

  async deleteBranch(codeBranch: string): Promise<Result<void, DomainError>> {
    return this.gitOps.deleteBranch(this.stateBranch(codeBranch));
  }
}
