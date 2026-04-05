import { existsSync, readFileSync, accessSync, constants, readdirSync } from 'node:fs';
import path from 'node:path';
import { restoreBranchUseCase } from '../../application/state-branch/restore-branch.js';
import { isOk, Ok, Err } from '../../domain/result.js';
import { BranchMetaSchema } from '../../domain/value-objects/branch-meta.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { readLocalStamp, writeLocalStamp, writeSyntheticStamp } from '../../infrastructure/hooks/branch-meta-stamp.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { JsonlJournalAdapter } from '../../infrastructure/adapters/journal/jsonl-journal.adapter.js';
import { resumeSlice } from '../../application/resume/resume-slice.js';
import { acquireSyncLock } from '../../infrastructure/locking/tff-lock.js';

export type RecoveryTier = 'T1' | 'T2' | 'T3';

export interface StateRepairResult {
  readonly action: 'restored' | 'synthetic' | 'failed' | 'skipped' | 'needs-tiered-recovery';
  readonly reason?: string;
  readonly filesRestored?: number;
  readonly tier?: RecoveryTier;
  readonly durationMs?: number;
  readonly consistent?: boolean;
}

interface ParsedArgs {
  codeBranch: string | undefined;
  tier: RecoveryTier | undefined;
}

function parseArgs(args: string[]): ParsedArgs | { error: { code: string; message: string } } {
  let codeBranch: string | undefined;
  let tier: RecoveryTier | undefined;

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
    } else if (!arg.startsWith('--')) {
      codeBranch = arg;
    }
  }

  return { codeBranch, tier };
}

function detectCorruptionLevel(cwd: string): RecoveryTier {
  const tffDir = path.join(cwd, '.tff');
  const stateDbPath = path.join(tffDir, 'state.db');
  const milestonesDir = path.join(cwd, '.gsd', 'milestones');

  // T3: Severe corruption - .tff directory completely missing
  if (!existsSync(tffDir)) {
    return 'T3';
  }

  // T2: Moderate corruption - state.db exists but is corrupted (invalid SQLite)
  // Note: Missing state.db is handled by T1 (restore from state branch)
  if (existsSync(stateDbPath) && !isDbValid(stateDbPath)) {
    return 'T2';
  }

  // T2: .tff exists with corrupted state AND milestones directory missing
  // This suggests more than just a missing state.db - partial corruption
  if (existsSync(stateDbPath) && !isDbValid(stateDbPath) && !existsSync(milestonesDir)) {
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
async function validateRestoredState(cwd: string): Promise<{ consistent: boolean; checkedSlices: number; errors: string[] }> {
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
    errors 
  };
}

export const stateRepairCmd = async (args: string[]): Promise<string> => {
  // Parse arguments
  const parsed = parseArgs(args);
  if ('error' in parsed) {
    return JSON.stringify({ ok: false, error: parsed.error });
  }

  const { codeBranch, tier: explicitTier } = parsed;

  if (!codeBranch) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: state:repair <branch> [--tier T1|T2|T3]' },
    });
  }

  const cwd = process.cwd();
  const tffDir = path.join(cwd, '.tff');

  // Auto-detect tier if not explicitly provided
  const detectedTier = detectCorruptionLevel(cwd);
  const tier = explicitTier ?? detectedTier;

  // Handle tiered recovery paths
  if (tier === 'T3') {
    // T3: Severe corruption - .tff directory missing or severely corrupted
    // Return a response indicating tiered recovery is needed
    return JSON.stringify({
      ok: true,
      data: { 
        action: 'needs-tiered-recovery', 
        reason: `T3 recovery required: .tff/ directory missing or severely corrupted (detected: ${detectedTier})`,
        tier: 'T3',
      },
    });
  }

  if (tier === 'T2') {
    // T2: Moderate corruption - restore .tff/ from state branch with validation
    const startTime = Date.now();
    
    type T2SuccessResult = { 
      action: 'restored' | 'synthetic'; 
      filesRestored?: number; 
      reason?: string;
      tier: 'T2';
      durationMs: number;
      consistent: boolean;
    };
    type T2ErrorResult = { code: string; message: string };
    
    // Acquire lock directly (bypass withSyncLock which creates state stores with branch alignment checks)
    const stateDbPath = path.join(cwd, '.tff', 'state.db');
    const release = await acquireSyncLock(stateDbPath, 5000);
    
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
              message: `No state branch found for "${codeBranch}"` 
            },
          });
        }
      }

      // Restore .tff/ from state branch
      const restoreResult = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

      if (!isOk(restoreResult)) {
        return JSON.stringify({
          ok: false,
          error: { 
            code: 'RESTORE_FAILED', 
            message: `Restore failed: ${restoreResult.error.code} - ${restoreResult.error.message}` 
          },
        });
      }

      // Validate the restored state
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
            message: `No state branch found for "${codeBranch}"` 
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
