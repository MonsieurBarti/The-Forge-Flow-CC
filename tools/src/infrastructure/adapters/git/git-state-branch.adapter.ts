import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mergeStateSnapshots } from '../../../application/state-branch/merge-state-snapshots.js';
import type { DomainError } from '../../../domain/errors/domain-error.js';
import { stateBranchNotFoundError } from '../../../domain/errors/state-branch-not-found.error.js';
import { syncFailedError } from '../../../domain/errors/sync-failed.error.js';
import type { GitOps } from '../../../domain/ports/git-ops.port.js';
import type { StateBranchPort } from '../../../domain/ports/state-branch.port.js';
import type { StateExporter, StateImporter } from '../../../domain/ports/state-exporter.port.js';
import { Err, isOk, Ok, type Result } from '../../../domain/result.js';
import type { BranchMeta } from '../../../domain/value-objects/branch-meta.js';
import type { MergeResult } from '../../../domain/value-objects/merge-result.js';
import type { RestoreResult } from '../../../domain/value-objects/restore-result.js';
import type { StateSnapshot } from '../../../domain/value-objects/state-snapshot.js';
import { copyTffToWorktree } from './copy-tff-to-worktree.js';

const STATE_PREFIX = 'tff-state/';

export class GitStateBranchAdapter implements StateBranchPort {
  private resolvedDefaultBranch: string | undefined;

  constructor(
    private readonly gitOps: GitOps,
    private readonly repoRoot: string,
    private readonly exporter?: StateExporter,
    private readonly importer?: StateImporter,
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

    // S02: Check for JSON-based state (state-snapshot.json) and use importer if available
    const hasJsonSnapshot = filesR.data.includes('.tff/state-snapshot.json');
    if (hasJsonSnapshot && this.importer) {
      const snapshotR = await this.gitOps.extractFile(stateBr, '.tff/state-snapshot.json');
      if (isOk(snapshotR)) {
        try {
          const snapshot = this.parseSnapshotWithDates(snapshotR.data.toString('utf8'));
          const importR = this.importer.import(snapshot);
          if (isOk(importR)) {
            // JSON import succeeded - also restore non-snapshot files (markdown artifacts)
            let filesRestored = 1; // count the JSON snapshot
            const resolvedTargetDir = path.resolve(targetDir);
            for (const filePath of filesR.data) {
              if (!filePath.startsWith('.tff/')) continue;
              if (filePath === '.tff/state-snapshot.json') continue; // already handled via importer
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
            return Ok({ filesRestored, schemaVersion: snapshot.version ?? 1, source: 'json' });
          }
          // Fall through to file-based restore if import fails
        } catch {
          // JSON parse failed, fall through to file-based restore
        }
      }
    }

    // Legacy file-based restore (or fallback)
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

    return Ok({ filesRestored, schemaVersion: 0, source: 'files' });
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

    // S03: JSON-based state merging using state-snapshot.json
    // Extract and parse JSON snapshots from both parent and child state branches

    // Step 1: Extract parent's state-snapshot.json
    const parentSnapshotR = await this.gitOps.extractFile(parentStateBr, '.tff/state-snapshot.json');
    if (!isOk(parentSnapshotR)) {
      return Err(syncFailedError('Failed to extract parent state snapshot', { parentStateBr }));
    }

    let parentSnapshot: StateSnapshot;
    try {
      parentSnapshot = this.parseSnapshotWithDates(parentSnapshotR.data.toString('utf8'));
    } catch (e) {
      return Err(
        syncFailedError('Failed to parse parent state snapshot', {
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }

    // Step 2: Extract child's state-snapshot.json
    const childSnapshotR = await this.gitOps.extractFile(childStateBr, '.tff/state-snapshot.json');
    if (!isOk(childSnapshotR)) {
      return Err(syncFailedError('Failed to extract child state snapshot', { childStateBr }));
    }

    let childSnapshot: StateSnapshot;
    try {
      childSnapshot = this.parseSnapshotWithDates(childSnapshotR.data.toString('utf8'));
    } catch (e) {
      return Err(
        syncFailedError('Failed to parse child state snapshot', {
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }

    // Step 3: Merge the snapshots using the entity-level merge logic
    const mergeR = mergeStateSnapshots(parentSnapshot, childSnapshot, sliceId);
    if (!isOk(mergeR)) return mergeR;
    const mergedSnapshot = mergeR.data;

    // Calculate merged entity counts
    const childTaskIds = new Set(childSnapshot.tasks.filter((t) => t.sliceId === sliceId).map((t) => t.id));
    const entitiesMerged = 1 + childTaskIds.size; // 1 slice + tasks for that slice

    // Step 4: Checkout parent worktree and write merged snapshot + child artifacts
    const tmpPath = this.tmpWorktreePath();
    mkdirSync(tmpPath, { recursive: true });
    const wtR = await this.gitOps.checkoutWorktree(tmpPath, parentStateBr);
    if (!isOk(wtR)) return wtR;

    try {
      // Write merged JSON snapshot to parent worktree
      const destSnapshotPath = path.join(tmpPath, '.tff', 'state-snapshot.json');
      mkdirSync(path.dirname(destSnapshotPath), { recursive: true });
      writeFileSync(destSnapshotPath, JSON.stringify(mergedSnapshot, null, 2));

      // Step 5: Artifact merge — copy child's slice-scoped files to parent (AC9)
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
      return Ok({ entitiesMerged, artifactsCopied });
    } finally {
      await this.gitOps.deleteWorktree(tmpPath);
    }
  }

  /**
   * Parse a JSON state snapshot and convert ISO date strings back to Date objects.
   * Mirrors the date conversion logic in restore() for consistency.
   */
  private parseSnapshotWithDates(jsonString: string): StateSnapshot {
    const raw = JSON.parse(jsonString);

    // Convert date strings back to Date objects
    if (raw.project?.createdAt) raw.project.createdAt = new Date(raw.project.createdAt);
    if (raw.milestones) {
      raw.milestones = raw.milestones.map((m: Record<string, unknown>) => ({
        ...m,
        createdAt: new Date(m.createdAt as string),
        updatedAt: m.updatedAt ? new Date(m.updatedAt as string) : undefined,
      }));
    }
    if (raw.slices) {
      raw.slices = raw.slices.map((s: Record<string, unknown>) => ({
        ...s,
        createdAt: new Date(s.createdAt as string),
        updatedAt: s.updatedAt ? new Date(s.updatedAt as string) : undefined,
      }));
    }
    if (raw.tasks) {
      raw.tasks = raw.tasks.map((t: Record<string, unknown>) => ({
        ...t,
        createdAt: new Date(t.createdAt as string),
        updatedAt: t.updatedAt ? new Date(t.updatedAt as string) : undefined,
        claimedAt: t.claimedAt ? new Date(t.claimedAt as string) : undefined,
      }));
    }
    if (raw.dependencies) {
      raw.dependencies = raw.dependencies.map((d: Record<string, unknown>) => ({
        ...d,
        createdAt: d.createdAt ? new Date(d.createdAt as string) : undefined,
      }));
    }
    if (raw.workflowSession?.pausedAt) {
      raw.workflowSession.pausedAt = new Date(raw.workflowSession.pausedAt as string);
    }
    if (raw.reviews) {
      raw.reviews = raw.reviews.map((r: Record<string, unknown>) => ({
        ...r,
        createdAt: new Date(r.createdAt as string),
      }));
    }

    return raw as StateSnapshot;
  }

  async deleteBranch(codeBranch: string): Promise<Result<void, DomainError>> {
    return this.gitOps.deleteBranch(this.stateBranch(codeBranch));
  }
}
