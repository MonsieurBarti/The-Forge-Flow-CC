import path from 'node:path';
import { restoreBranchUseCase } from '../application/state-branch/restore-branch.js';
import { BranchMismatchError } from '../domain/errors/branch-mismatch.error.js';
import { isOk } from '../domain/result.js';
import { BranchMetaSchema } from '../domain/value-objects/branch-meta.js';
import { GitCliAdapter } from '../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../infrastructure/adapters/git/git-state-branch.adapter.js';
import {
  type ClosableStateStores,
  createClosableStateStores,
  createClosableStateStoresUnchecked,
  createStateStores,
  createStateStoresUnchecked,
  type StateStores,
} from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { writeLocalStamp, writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';

async function handleMismatch(error: BranchMismatchError): Promise<boolean> {
  const cwd = process.cwd();
  const tffDir = path.join(cwd, '.tff');
  const gitOps = new GitCliAdapter(cwd);
  const stateBranch = new GitStateBranchAdapter(gitOps, cwd);

  const result = await restoreBranchUseCase({ codeBranch: error.currentBranch, targetDir: cwd }, { stateBranch });

  if (isOk(result) && result.data !== null) {
    // Extract stateId from branch-meta.json in git (not disk, to avoid leaking root-level artifacts)
    const metaBufR = await gitOps.extractFile(`tff-state/${error.currentBranch}`, 'branch-meta.json');
    if (isOk(metaBufR)) {
      try {
        const raw = JSON.parse(metaBufR.data.toString('utf8'));
        const meta = BranchMetaSchema.parse(raw);
        writeLocalStamp(tffDir, {
          stateId: meta.stateId,
          codeBranch: error.currentBranch,
          parentStateBranch: meta.parentStateBranch,
          createdAt: meta.createdAt,
        });
      } catch {
        writeSyntheticStamp(tffDir, error.currentBranch);
      }
    } else {
      writeSyntheticStamp(tffDir, error.currentBranch);
    }
    return true;
  }

  // Restore failed or no state branch -- write synthetic stamp to prevent loop
  writeSyntheticStamp(tffDir, error.currentBranch);
  console.warn(`[tff] restore failed for branch "${error.currentBranch}", using existing state`);
  return false;
}

export async function withBranchGuard<T>(
  fn: (stores: StateStores) => Promise<T>,
  opts?: { dbPath?: string },
): Promise<T> {
  try {
    const stores = createStateStores(opts?.dbPath);
    return await fn(stores);
  } catch (e) {
    if (!(e instanceof BranchMismatchError)) throw e;
    await handleMismatch(e);
    const stores = createStateStoresUnchecked(opts?.dbPath);
    return await fn(stores);
  }
}

export async function withClosableBranchGuard<T>(
  fn: (stores: ClosableStateStores) => Promise<T>,
  opts?: { dbPath?: string },
): Promise<T> {
  try {
    const stores = createClosableStateStores(opts?.dbPath);
    return await fn(stores);
  } catch (e) {
    if (!(e instanceof BranchMismatchError)) throw e;
    await handleMismatch(e);
    const stores = createClosableStateStoresUnchecked(opts?.dbPath);
    return await fn(stores);
  }
}
