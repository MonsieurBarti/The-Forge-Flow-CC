import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { restoreBranchUseCase } from '../../application/state-branch/restore-branch.js';
import { isOk } from '../../domain/result.js';
import { BranchMetaSchema } from '../../domain/value-objects/branch-meta.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { readLocalStamp, writeLocalStamp, writeSyntheticStamp } from '../../infrastructure/hooks/branch-meta-stamp.js';

export interface StateRepairResult {
  readonly action: 'restored' | 'synthetic' | 'failed' | 'skipped';
  readonly reason?: string;
  readonly filesRestored?: number;
}

export const stateRepairCmd = async (args: string[]): Promise<string> => {
  const [codeBranch] = args;
  if (!codeBranch) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: state:repair <branch>' },
    });
  }

  const cwd = process.cwd();
  const tffDir = path.join(cwd, '.tff');

  try {
    const gitOps = new GitCliAdapter(cwd);
    const stateBranch = new GitStateBranchAdapter(gitOps, cwd);

    // Check if stamp already matches (idempotent - check this first)
    const stamp = readLocalStamp(tffDir);
    if (stamp && stamp.codeBranch === codeBranch) {
      return JSON.stringify({
        ok: true,
        data: { action: 'skipped', reason: 'Stamp already matches target branch' },
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
          reason: `Restore failed: ${result.error.code} - ${result.error.message}` 
        },
      });
    }

    if (result.data === null) {
      // Write synthetic stamp when restore returns null
      writeSyntheticStamp(tffDir, codeBranch);
      return JSON.stringify({
        ok: true,
        data: { action: 'synthetic', reason: 'Restore returned null (no state to restore)' },
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
            reason: 'Restored but no root branch-meta.json found' 
          },
        });
      }
    } catch {
      writeSyntheticStamp(tffDir, codeBranch);
      return JSON.stringify({
        ok: true,
        data: { 
          action: 'synthetic', 
          reason: 'Restored but failed to read root branch-meta.json' 
        },
      });
    }

    return JSON.stringify({
      ok: true,
      data: { 
        action: 'restored', 
        filesRestored: result.data.filesRestored 
      },
    });
  } catch (e) {
    return JSON.stringify({
      ok: false,
      error: { code: 'REPAIR_FAILED', message: String(e) },
    });
  }
};
