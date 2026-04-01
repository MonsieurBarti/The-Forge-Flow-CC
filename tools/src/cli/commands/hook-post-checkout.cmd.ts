import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { restoreBranchUseCase } from '../../application/state-branch/restore-branch.js';
import { isOk } from '../../domain/result.js';
import { BranchMetaSchema } from '../../domain/value-objects/branch-meta.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { readLocalStamp, writeLocalStamp, writeSyntheticStamp } from '../../infrastructure/hooks/branch-meta-stamp.js';
import { acquireRestoreLock } from '../../infrastructure/locking/tff-lock.js';

export const hookPostCheckoutCmd = async (args: string[]): Promise<string> => {
  const [codeBranch] = args;
  if (!codeBranch) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: hook:post-checkout <branch>' },
    });
  }

  const cwd = process.cwd();
  const tffDir = path.join(cwd, '.tff');

  try {
    // 1. Check if state branch exists
    const gitOps = new GitCliAdapter(cwd);
    const stateBranch = new GitStateBranchAdapter(gitOps, cwd);
    const existsResult = await stateBranch.exists(codeBranch);
    if (!isOk(existsResult) || !existsResult.data) {
      return JSON.stringify({
        ok: true,
        data: { action: 'skipped', reason: `No state branch for "${codeBranch}"` },
      });
    }

    // 2. Check if stamp already matches
    const stamp = readLocalStamp(tffDir);
    if (stamp && stamp.codeBranch === codeBranch) {
      return JSON.stringify({
        ok: true,
        data: { action: 'skipped', reason: 'Stamp already matches current branch' },
      });
    }

    // 3. Acquire exclusive lock (timeout 5s)
    const dbPath = path.join(tffDir, 'state.db');
    let release: (() => Promise<void>) | null = null;
    if (existsSync(dbPath)) {
      release = await acquireRestoreLock(dbPath, 5000);
      if (!release) {
        return JSON.stringify({
          ok: true,
          data: { action: 'skipped', reason: 'Lock held by another process' },
        });
      }
    }

    try {
      // 4. Restore
      const result = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });

      if (!isOk(result) || result.data === null) {
        writeSyntheticStamp(tffDir, codeBranch);
        return JSON.stringify({
          ok: true,
          data: { action: 'skipped', reason: 'Restore returned null' },
        });
      }

      // 5. Write stamp — read stateId from root-level branch-meta.json
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
        data: { action: 'restored', filesRestored: result.data.filesRestored },
      });
    } finally {
      if (release) await release();
    }
  } catch (e) {
    // Hook should never fail — always return ok
    return JSON.stringify({
      ok: true,
      data: { action: 'error', reason: String(e) },
    });
  }
};
