import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { resumeSlice } from '../../application/resume/resume-slice.js';
import { restoreBranchUseCase } from '../../application/state-branch/restore-branch.js';
import { generateState } from '../../application/sync/generate-state.js';
import { isOk } from '../../domain/result.js';
import { BranchMetaSchema } from '../../domain/value-objects/branch-meta.js';
import type { StateSnapshot } from '../../domain/value-objects/state-snapshot.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { JsonlJournalAdapter } from '../../infrastructure/adapters/journal/jsonl-journal.adapter.js';
import { SQLiteStateImporter } from '../../infrastructure/adapters/export/sqlite-state-importer.js';
import { createStateStoresUnchecked } from '../../infrastructure/adapters/sqlite/create-state-stores.js';
import { SQLiteSalvage } from '../../infrastructure/adapters/sqlite/sqlite-salvage.js';
import { SQLiteStateAdapter } from '../../infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { readLocalStamp, writeLocalStamp, writeSyntheticStamp } from '../../infrastructure/hooks/branch-meta-stamp.js';
import { acquireSyncLock } from '../../infrastructure/locking/tff-lock.js';

export type RecoveryTier = 'T1' | 'T2' | 'T3';

export interface StateRepairResult {
  readonly action: 'restored' | 'synthetic' | 'failed' | 'skipped' | 'needs-tiered-recovery';
  readonly reason?: string;
  readonly filesRestored?: number;
  readonly tier?: RecoveryTier;
  readonly durationMs?: number;
  readonly consistent?: boolean;
  readonly regenerated?: boolean;
  readonly milestoneId?: string;
  // Salvage metadata for T2 recovery with corrupted DB
  readonly salvaged?: boolean;
  readonly tablesSalvaged?: string[];
  readonly salvageNotes?: string[];
}

interface ParsedArgs {
  codeBranch: string | undefined;
  tier: RecoveryTier | undefined;
  milestoneId: string | undefined;
}

function parseArgs(args: string[]): ParsedArgs | { error: { code: string; message: string } } {
  let codeBranch: string | undefined;
  let tier: RecoveryTier | undefined;
  let milestoneId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--tier') {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith('--')) {
        return { error: { code: 'INVALID_ARGS', message: 'Usage: --tier requires a value (T1, T2, or T3)' } };
      }
      const tierValue = nextArg.toUpperCase();
      if (tierValue !== 'T1' && tierValue !== 'T2' && tierValue !== 'T3') {
        return { error: { code: 'INVALID_ARGS', message: `Invalid tier "${nextArg}". Valid values: T1, T2, T3` } };
      }
      tier = tierValue as RecoveryTier;
      i++; // Skip the next argument as we've consumed it
    } else if (arg === '--milestone') {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith('--')) {
        return { error: { code: 'INVALID_ARGS', message: 'Usage: --milestone requires a value (e.g., M001)' } };
      }
      milestoneId = nextArg;
      i++; // Skip the next argument as we've consumed it
    } else if (!arg.startsWith('--')) {
      codeBranch = arg;
    }
  }

  return { codeBranch, tier, milestoneId };
}

function detectCorruptionLevel(cwd: string): RecoveryTier {
  const tffDir = path.join(cwd, '.tff');
  const stateDbPath = path.join(tffDir, 'state.db');
  const milestonesDir = path.join(cwd, '.tff', 'milestones');

  // T3: Severe corruption - .tff directory completely missing
  if (!existsSync(tffDir)) {
    return 'T3';
  }

  // T3: .tff exists but BOTH state.db is missing AND project milestones are missing
  // This indicates complete loss of both runtime state AND project metadata
  if (!existsSync(stateDbPath) && !existsSync(milestonesDir)) {
    return 'T3';
  }

  // T2: Moderate corruption - state.db exists but is corrupted (invalid SQLite)
  // This takes precedence over T3 - if state.db exists but is bad, we can restore it
  if (existsSync(stateDbPath) && !isDbValid(stateDbPath)) {
    return 'T2';
  }

  // T1: Everything else - minor corruption, stamp mismatch, or missing state.db (restorable)
  return 'T1';
}

function isDbValid(dbPath: string): boolean {
  try {
    // Try to read the SQLite header - valid SQLite files start with "SQLite format 3\0"
    const header = readFileSync(dbPath, { encoding: null, flag: 'r' });
    const sqliteMagic = Buffer.from('SQLite format 3\0');
    if (header.length < sqliteMagic.length) {
      return false;
    }
    return header.subarray(0, sqliteMagic.length).equals(sqliteMagic);
  } catch {
    return false;
  }
}

/**
 * Merge salvaged data with restored state branch data.
 * Semantics:
 * - Salvaged data wins for entities that exist in both (local uncommitted work takes priority)
 * - State branch data fills gaps where salvage returned null/empty
 * - If salvage returns empty/null snapshot, use restored data entirely
 */
function mergeSalvagedWithRestored(
  salvaged: StateSnapshot | null,
  restored: StateSnapshot,
): StateSnapshot {
  // If no salvaged data, return restored as-is
  if (!salvaged) {
    return restored;
  }

  // Build lookup sets for quick existence checks
  const salvagedMilestoneIds = new Set(salvaged.milestones.map((m) => m.id));
  const salvagedSliceIds = new Set(salvaged.slices.map((s) => s.id));
  const salvagedTaskIds = new Set(salvaged.tasks.map((t) => t.id));

  // Merge: salvaged entities take priority
  const mergedMilestones = [
    // Restored milestones that don't exist in salvage
    ...restored.milestones.filter((m) => !salvagedMilestoneIds.has(m.id)),
    // All salvaged milestones (they win)
    ...salvaged.milestones,
  ];

  const mergedSlices = [
    // Restored slices that don't exist in salvage
    ...restored.slices.filter((s) => !salvagedSliceIds.has(s.id)),
    // All salvaged slices (they win)
    ...salvaged.slices,
  ];

  const mergedTasks = [
    // Restored tasks that don't exist in salvage
    ...restored.tasks.filter((t) => !salvagedTaskIds.has(t.id)),
    // All salvaged tasks (they win)
    ...salvaged.tasks,
  ];

  // For dependencies: take all from restored, then overlay with salvaged
  // Build a key for deduplication: "fromId->toId"
  const dependencyKey = (d: { fromId: string; toId: string }) => `${d.fromId}->${d.toId}`;
  const mergedDeps = new Map<string, typeof restored.dependencies[0]>();

  // Add restored dependencies first
  for (const dep of restored.dependencies) {
    mergedDeps.set(dependencyKey(dep), dep);
  }

  // Overlay with salvaged dependencies (they win if same key)
  for (const dep of salvaged.dependencies) {
    mergedDeps.set(dependencyKey(dep), dep);
  }

  // Project: salvaged wins if exists
  const mergedProject = salvaged.project ?? restored.project;

  // Session: salvaged wins if exists
  const mergedSession = salvaged.workflowSession ?? restored.workflowSession;

  // Reviews: merge by sliceId+reviewer+type+commitSha as unique key
  const reviewKey = (r: { sliceId: string; reviewer: string; type: string; commitSha: string }) =>
    `${r.sliceId}:${r.reviewer}:${r.type}:${r.commitSha}`;
  const mergedReviews = new Map<string, typeof restored.reviews[0]>();

  for (const review of restored.reviews) {
    mergedReviews.set(reviewKey(review), review);
  }

  for (const review of salvaged.reviews) {
    mergedReviews.set(reviewKey(review), review);
  }

  return {
    version: restored.version,
    exportedAt: new Date().toISOString(),
    project: mergedProject,
    milestones: mergedMilestones,
    slices: mergedSlices,
    tasks: mergedTasks,
    dependencies: Array.from(mergedDeps.values()),
    workflowSession: mergedSession,
    reviews: Array.from(mergedReviews.values()),
  };
}

/**
 * Find all slice IDs that have checkpoints in the restored state.
 * Used for T2 recovery validation.
 */
function findSlicesWithCheckpoints(cwd: string): string[] {
  const slicesDir = path.join(cwd, '.tff', 'milestones');
  if (!existsSync(slicesDir)) {
    return [];
  }

  const sliceIds: string[] = [];

  // Walk through milestones/*/slices/* to find CHECKPOINT.md files
  try {
    const milestoneEntries = readdirSync(slicesDir, { withFileTypes: true });
    for (const milestoneEntry of milestoneEntries) {
      if (!milestoneEntry.isDirectory()) continue;

      const slicesPath = path.join(slicesDir, milestoneEntry.name, 'slices');
      if (!existsSync(slicesPath)) continue;

      const sliceEntries = readdirSync(slicesPath, { withFileTypes: true });
      for (const sliceEntry of sliceEntries) {
        if (!sliceEntry.isDirectory()) continue;

        const checkpointPath = path.join(slicesPath, sliceEntry.name, 'CHECKPOINT.md');
        if (existsSync(checkpointPath)) {
          // Slice ID format: MXXX-SXX
          sliceIds.push(`${milestoneEntry.name}-${sliceEntry.name}`);
        }
      }
    }
  } catch {
    // Ignore errors during directory walking
  }

  return sliceIds;
}

/**
 * Validate restored state by checking journal/checkpoint consistency
 * for all slices with checkpoints. Returns true if all are consistent.
 */
async function validateRestoredState(
  cwd: string,
): Promise<{ consistent: boolean; checkedSlices: number; errors: string[] }> {
  const sliceIds = findSlicesWithCheckpoints(cwd);

  if (sliceIds.length === 0) {
    // No slices with checkpoints - check if state.db is at least valid
    const stateDbPath = path.join(cwd, '.tff', 'state.db');
    return { consistent: existsSync(stateDbPath) && isDbValid(stateDbPath), checkedSlices: 0, errors: [] };
  }

  const artifactStore = new MarkdownArtifactAdapter(cwd);
  const journal = new JsonlJournalAdapter(path.join(cwd, '.tff', 'journal'));

  const errors: string[] = [];
  let consistentCount = 0;

  for (const sliceId of sliceIds) {
    try {
      const result = await resumeSlice({ sliceId }, { artifactStore, journal });
      if (isOk(result) && result.data.consistent) {
        consistentCount++;
      } else if (!isOk(result)) {
        errors.push(`Slice ${sliceId}: ${result.error.message}`);
      } else {
        errors.push(`Slice ${sliceId}: inconsistent state`);
      }
    } catch (e) {
      errors.push(`Slice ${sliceId}: ${String(e)}`);
    }
  }

  return {
    consistent: errors.length === 0 && consistentCount === sliceIds.length,
    checkedSlices: sliceIds.length,
    errors,
  };
}

export const stateRepairCmd = async (args: string[]): Promise<string> => {
  // Parse arguments
  const parsed = parseArgs(args);
  if ('error' in parsed) {
    return JSON.stringify({ ok: false, error: parsed.error });
  }

  const { codeBranch, tier: explicitTier, milestoneId: milestoneIdArg } = parsed;

  if (!codeBranch) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: state:repair <branch> [--tier T1|T2|T3] [--milestone MXXX]' },
    });
  }

  const cwd = process.cwd();
  const tffDir = path.join(cwd, '.tff');

  // Auto-detect tier if not explicitly provided
  const detectedTier = detectCorruptionLevel(cwd);
  const tier = explicitTier ?? detectedTier;

  // Handle tiered recovery paths
  if (tier === 'T3') {
    // T3: Severe corruption - restore .tff/ from state branch + regenerate project files
    const startTime = Date.now();

    type T3SuccessResult = {
      action: 'restored' | 'synthetic';
      filesRestored?: number;
      reason?: string;
      tier: 'T3';
      durationMs: number;
      consistent: boolean;
      regenerated: boolean;
      milestoneId?: string;
    };
    type T3ErrorResult = { code: string; message: string };

    // Derive or validate milestoneId for regeneration
    let targetMilestoneId = milestoneIdArg;

    // For T3, .tff may not exist yet - create directory temporarily for lock
    const stateDbPath = path.join(cwd, '.tff', 'state.db');
    if (!existsSync(tffDir)) {
      mkdirSync(tffDir, { recursive: true });
    }

    // Acquire lock with longer timeout for tests
    const release = await acquireSyncLock(stateDbPath, 10000);

    if (release === null) {
      return JSON.stringify({
        ok: true,
        data: {
          action: 'skipped',
          reason: 'Lock held by another process',
          tier: 'T3',
        },
      });
    }

    try {
      const gitOps = new GitCliAdapter(cwd);
      const stateBranch = new GitStateBranchAdapter(gitOps, cwd);

      // Check if state branch exists
      const existsResult = await stateBranch.exists(codeBranch);
      if (!isOk(existsResult) || !existsResult.data) {
        // Try to fetch from remote
        await gitOps.fetchBranch(`tff-state/${codeBranch}`).catch(() => undefined);

        // Re-check after fetch
        const existsAfterFetch = await stateBranch.exists(codeBranch);
        if (!isOk(existsAfterFetch) || !existsAfterFetch.data) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'STATE_BRANCH_NOT_FOUND',
              message: `No state branch found for "${codeBranch}"`,
            },
          });
        }
      }

      // Restore .tff/ from state branch (T2 steps)
      const restoreResult = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

      if (!isOk(restoreResult)) {
        return JSON.stringify({
          ok: false,
          error: {
            code: 'RESTORE_FAILED',
            message: `Restore failed: ${restoreResult.error.code} - ${restoreResult.error.message}`,
          },
        });
      }

      // Validate the restored state
      const validation = await validateRestoredState(cwd);

      // If restore returned null, we can't regenerate
      if (restoreResult.data === null) {
        const durationMs = Date.now() - startTime;
        // Warn if timing exceeded 5s per R001
        if (durationMs > 5000) {
          console.warn(`[state:repair] T3 recovery took ${durationMs}ms, exceeding 5s target`);
        }
        writeSyntheticStamp(tffDir, codeBranch);
        return JSON.stringify({
          ok: true,
          data: {
            action: 'synthetic',
            reason: 'Restore returned null (no state to restore), cannot regenerate project files',
            tier: 'T3',
            durationMs,
            consistent: validation.consistent,
            regenerated: false,
          },
        });
      }

      // Write stamp from restored state
      const rootMetaPath = path.join(cwd, 'branch-meta.json');
      try {
        if (existsSync(rootMetaPath)) {
          const raw = JSON.parse(readFileSync(rootMetaPath, 'utf8'));
          const meta = BranchMetaSchema.parse(raw);
          writeLocalStamp(tffDir, {
            stateId: meta.stateId,
            codeBranch,
            parentStateBranch: meta.parentStateBranch,
            createdAt: meta.createdAt,
          });
        } else {
          writeSyntheticStamp(tffDir, codeBranch);
        }
      } catch {
        writeSyntheticStamp(tffDir, codeBranch);
      }

      // Now regenerate project files using generateState
      // Create state stores from the restored database (bypass branch alignment check)
      const { milestoneStore, sliceStore, taskStore } = createStateStoresUnchecked(stateDbPath);

      // If no milestoneId provided, get first milestone from database
      if (!targetMilestoneId) {
        const milestonesResult = milestoneStore.listMilestones();
        if (isOk(milestonesResult) && milestonesResult.data.length > 0) {
          targetMilestoneId = milestonesResult.data[0].id;
        }
      }

      if (!targetMilestoneId) {
        const durationMs = Date.now() - startTime;
        if (durationMs > 5000) {
          console.warn(`[state:repair] T3 recovery took ${durationMs}ms, exceeding 5s target`);
        }
        return JSON.stringify({
          ok: false,
          error: {
            code: 'MILESTONE_NOT_FOUND',
            message:
              'T3 recovery requires a milestone to regenerate STATE.md. Use --milestone M001 or ensure database has milestones.',
          },
        });
      }

      // Regenerate STATE.md via generateState use case
      const artifactStore = new MarkdownArtifactAdapter(cwd);
      const generateResult = await generateState(
        { milestoneId: targetMilestoneId },
        { milestoneStore, sliceStore, taskStore, artifactStore },
      );

      if (!isOk(generateResult)) {
        const durationMs = Date.now() - startTime;
        if (durationMs > 5000) {
          console.warn(`[state:repair] T3 recovery took ${durationMs}ms, exceeding 5s target`);
        }
        return JSON.stringify({
          ok: false,
          error: {
            code: 'REGENERATION_FAILED',
            message: `Failed to regenerate STATE.md: ${generateResult.error.message}`,
          },
        });
      }

      const durationMs = Date.now() - startTime;

      // Warn if timing exceeded 5s per R001
      if (durationMs > 5000) {
        console.warn(`[state:repair] T3 recovery took ${durationMs}ms, exceeding 5s target`);
      }

      return JSON.stringify({
        ok: true,
        data: {
          action: 'restored',
          filesRestored: restoreResult.data.filesRestored,
          tier: 'T3',
          durationMs,
          consistent: validation.consistent,
          regenerated: true,
          milestoneId: targetMilestoneId,
        },
      });
    } finally {
      await release();
    }
  }

  if (tier === 'T2') {
    // T2: Moderate corruption - restore .tff/ from state branch with optional salvage
    const startTime = Date.now();

    type T2SuccessResult = {
      action: 'restored' | 'synthetic';
      filesRestored?: number;
      reason?: string;
      tier: 'T2';
      durationMs: number;
      consistent: boolean;
      salvaged?: boolean;
      tablesSalvaged?: string[];
      salvageNotes?: string[];
    };
    type T2ErrorResult = { code: string; message: string };

    // Acquire lock directly (bypass withSyncLock which creates state stores with branch alignment checks)
    const stateDbPath = path.join(cwd, '.tff', 'state.db');
    const release = await acquireSyncLock(stateDbPath, 10000);

    if (release === null) {
      return JSON.stringify({
        ok: true,
        data: {
          action: 'skipped',
          reason: 'Lock held by another process',
          tier: 'T2',
        },
      });
    }

    // Track salvage results for metadata
    let salvageResult: ReturnType<typeof SQLiteSalvage.salvage> | null = null;
    let tablesSalvaged: string[] = [];
    let salvageNotes: string[] = [];

    try {
      // Step 1: Attempt to salvage data from corrupted local database (before restore overwrites it)
      if (existsSync(stateDbPath) && !isDbValid(stateDbPath)) {
        const salvageStartTime = Date.now();
        salvageResult = SQLiteSalvage.salvage(stateDbPath);

        if (salvageResult.ok && salvageResult.data.metadata) {
          tablesSalvaged = salvageResult.data.metadata.tablesSalvaged;
          salvageNotes = salvageResult.data.metadata.corruptionNotes;
          const salvageDuration = Date.now() - salvageStartTime;
          console.log(`[state:repair] Salvaged ${tablesSalvaged.length} tables (${salvageResult.data.metadata.rowsRecovered} rows) in ${salvageDuration}ms`);
        } else if (!salvageResult.ok) {
          salvageNotes.push(`Salvage failed: ${salvageResult.error.message}`);
          console.warn(`[state:repair] Salvage failed: ${salvageResult.error.message}`);
        }
      }

      const gitOps = new GitCliAdapter(cwd);
      const stateBranch = new GitStateBranchAdapter(gitOps, cwd);

      // Check if state branch exists
      const existsResult = await stateBranch.exists(codeBranch);
      if (!isOk(existsResult) || !existsResult.data) {
        // Try to fetch from remote
        await gitOps.fetchBranch(`tff-state/${codeBranch}`).catch(() => undefined);

        // Re-check after fetch
        const existsAfterFetch = await stateBranch.exists(codeBranch);
        if (!isOk(existsAfterFetch) || !existsAfterFetch.data) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'STATE_BRANCH_NOT_FOUND',
              message: `No state branch found for "${codeBranch}"`,
            },
          });
        }
      }

      // Step 2: Restore .tff/ from state branch
      const restoreResult = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

      if (!isOk(restoreResult)) {
        return JSON.stringify({
          ok: false,
          error: {
            code: 'RESTORE_FAILED',
            message: `Restore failed: ${restoreResult.error.code} - ${restoreResult.error.message}`,
          },
        });
      }

      // Step 3: If we have salvaged data AND restored data, merge them
      if (salvageResult?.ok && salvageResult.data.snapshot && restoreResult.data) {
        try {
          // Export the restored state from the database to get a snapshot for merging
          const adapter = SQLiteStateAdapter.create(stateDbPath);
          const { SQLiteStateExporter } = await import('../../infrastructure/adapters/export/sqlite-state-exporter.js');
          const exporter = new SQLiteStateExporter(adapter);
          const exportResult = exporter.export();

          if (!exportResult.ok) {
            console.warn(`[state:repair] Failed to export restored state for merge: ${exportResult.error.message}`);
            adapter.close();
          } else {
            // Merge salvaged data with restored state
            const mergedSnapshot = mergeSalvagedWithRestored(
              salvageResult.data.snapshot,
              exportResult.data,
            );

            // Write merged result to state.db using SQLiteStateImporter
            const importer = new SQLiteStateImporter(adapter);
            const importResult = importer.import(mergedSnapshot);

            if (!importResult.ok) {
              console.warn(`[state:repair] Failed to import merged snapshot: ${importResult.error.message}`);
            } else {
              console.log('[state:repair] Successfully merged salvaged data with restored state');
            }
            adapter.close();
          }
        } catch (mergeError) {
          console.warn(`[state:repair] Merge/import failed: ${mergeError}`);
          // Fall back to restored state only
        }
      }

      // Validate the restored (or merged) state
      const validation = await validateRestoredState(cwd);

      const durationMs = Date.now() - startTime;

      // Warn if timing exceeded 5s per R001
      if (durationMs > 5000) {
        console.warn(`[state:repair] T2 recovery took ${durationMs}ms, exceeding 5s target`);
      }

      if (restoreResult.data === null) {
        // Nothing was restored - return synthetic
        writeSyntheticStamp(tffDir, codeBranch);
        return JSON.stringify({
          ok: true,
          data: {
            action: 'synthetic',
            reason: 'Restore returned null (no state to restore)',
            tier: 'T2',
            durationMs,
            consistent: validation.consistent,
          },
        });
      }

      // Write stamp from restored state
      const rootMetaPath = path.join(cwd, 'branch-meta.json');
      try {
        if (existsSync(rootMetaPath)) {
          const raw = JSON.parse(readFileSync(rootMetaPath, 'utf8'));
          const meta = BranchMetaSchema.parse(raw);
          writeLocalStamp(tffDir, {
            stateId: meta.stateId,
            codeBranch,
            parentStateBranch: meta.parentStateBranch,
            createdAt: meta.createdAt,
          });
        } else {
          writeSyntheticStamp(tffDir, codeBranch);
        }
      } catch {
        writeSyntheticStamp(tffDir, codeBranch);
      }

      return JSON.stringify({
        ok: true,
        data: {
          action: 'restored',
          filesRestored: restoreResult.data.filesRestored,
          tier: 'T2',
          durationMs,
          consistent: validation.consistent,
          salvaged: salvageResult?.ok && tablesSalvaged.length > 0,
          tablesSalvaged: tablesSalvaged.length > 0 ? tablesSalvaged : undefined,
          salvageNotes: salvageNotes.length > 0 ? salvageNotes : undefined,
        },
      });
    } finally {
      await release();
    }
  }

  // T1: Standard repair flow - minor corruption or stamp mismatch
  try {
    const gitOps = new GitCliAdapter(cwd);
    const stateBranch = new GitStateBranchAdapter(gitOps, cwd);

    // Check if stamp already matches (idempotent - check this first)
    const stamp = readLocalStamp(tffDir);
    if (stamp && stamp.codeBranch === codeBranch) {
      return JSON.stringify({
        ok: true,
        data: { action: 'skipped', reason: 'Stamp already matches target branch', tier: 'T1' },
      });
    }

    // Check if state branch exists locally
    const existsResult = await stateBranch.exists(codeBranch);
    if (!isOk(existsResult) || !existsResult.data) {
      // Try to fetch from remote
      await gitOps.fetchBranch(`tff-state/${codeBranch}`).catch(() => undefined);

      // Re-check after fetch
      const existsAfterFetch = await stateBranch.exists(codeBranch);
      if (!isOk(existsAfterFetch) || !existsAfterFetch.data) {
        return JSON.stringify({
          ok: false,
          error: {
            code: 'STATE_BRANCH_NOT_FOUND',
            message: `No state branch found for "${codeBranch}"`,
          },
        });
      }
    }

    // Attempt restore
    const result = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

    if (!isOk(result)) {
      // Write synthetic stamp on failure to allow recovery
      writeSyntheticStamp(tffDir, codeBranch);
      return JSON.stringify({
        ok: true,
        data: {
          action: 'synthetic',
          reason: `Restore failed: ${result.error.code} - ${result.error.message}`,
          tier: 'T1',
        },
      });
    }

    if (result.data === null) {
      // Write synthetic stamp when restore returns null
      writeSyntheticStamp(tffDir, codeBranch);
      return JSON.stringify({
        ok: true,
        data: { action: 'synthetic', reason: 'Restore returned null (no state to restore)', tier: 'T1' },
      });
    }

    // Success: write proper stamp from root-level branch-meta.json
    const rootMetaPath = path.join(cwd, 'branch-meta.json');
    try {
      if (existsSync(rootMetaPath)) {
        const raw = JSON.parse(readFileSync(rootMetaPath, 'utf8'));
        const meta = BranchMetaSchema.parse(raw);
        writeLocalStamp(tffDir, {
          stateId: meta.stateId,
          codeBranch,
          parentStateBranch: meta.parentStateBranch,
          createdAt: meta.createdAt,
        });
      } else {
        writeSyntheticStamp(tffDir, codeBranch);
        return JSON.stringify({
          ok: true,
          data: {
            action: 'synthetic',
            reason: 'Restored but no root branch-meta.json found',
            tier: 'T1',
          },
        });
      }
    } catch {
      writeSyntheticStamp(tffDir, codeBranch);
      return JSON.stringify({
        ok: true,
        data: {
          action: 'synthetic',
          reason: 'Restored but failed to read root branch-meta.json',
          tier: 'T1',
        },
      });
    }

    return JSON.stringify({
      ok: true,
      data: {
        action: 'restored',
        filesRestored: result.data.filesRestored,
        tier: 'T1',
      },
    });
  } catch (e) {
    return JSON.stringify({
      ok: false,
      error: { code: 'REPAIR_FAILED', message: String(e) },
    });
  }
};
