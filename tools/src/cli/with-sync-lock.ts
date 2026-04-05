import path from 'node:path';
import { acquireSyncLock } from '../infrastructure/locking/tff-lock.js';
import {
  type ClosableStateStores,
  createClosableStateStores,
  createStateStores,
  type StateStores,
} from '../infrastructure/adapters/sqlite/create-state-stores.js';

export interface SyncLockResult {
  ok: true;
  data: {
    action: 'skipped';
    reason: string;
  };
}

function resolveLockPath(dbPath?: string): string {
  return dbPath ?? path.join(process.cwd(), '.tff', 'state.db');
}

export async function withSyncLock<T>(
  fn: (stores: StateStores) => Promise<T>,
  opts?: { dbPath?: string },
): Promise<T | SyncLockResult> {
  const lockPath = resolveLockPath(opts?.dbPath);
  const release = await acquireSyncLock(lockPath, 5000);

  if (release === null) {
    return { ok: true, data: { action: 'skipped', reason: 'Lock held by another process' } };
  }

  try {
    const stores = createStateStores(opts?.dbPath);
    return await fn(stores);
  } finally {
    await release();
  }
}

export async function withClosableSyncLock<T>(
  fn: (stores: ClosableStateStores) => Promise<T>,
  opts?: { dbPath?: string },
): Promise<T | SyncLockResult> {
  const lockPath = resolveLockPath(opts?.dbPath);
  const release = await acquireSyncLock(lockPath, 5000);

  if (release === null) {
    return { ok: true, data: { action: 'skipped', reason: 'Lock held by another process' } };
  }

  try {
    const stores = createClosableStateStores(opts?.dbPath);
    return await fn(stores);
  } finally {
    await release();
  }
}
