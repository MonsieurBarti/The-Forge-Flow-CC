import lockfile from 'proper-lockfile';

/**
 * Internal lock acquisition helper.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
async function acquireLock(targetPath: string, timeoutMs: number): Promise<(() => Promise<void>) | null> {
  try {
    const release = await lockfile.lock(targetPath, {
      retries: { retries: Math.ceil(timeoutMs / 200), factor: 1, minTimeout: 200 },
      stale: 30000,
    });
    return release;
  } catch {
    return null;
  }
}

/**
 * Acquire exclusive lock for restore operations.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export async function acquireRestoreLock(targetPath: string, timeoutMs = 5000): Promise<(() => Promise<void>) | null> {
  return acquireLock(targetPath, timeoutMs);
}

/**
 * Acquire exclusive lock for sync operations.
 * Targets the same file as acquireRestoreLock to ensure mutual exclusion.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export async function acquireSyncLock(targetPath: string, timeoutMs = 5000): Promise<(() => Promise<void>) | null> {
  return acquireLock(targetPath, timeoutMs);
}

export async function isLocked(targetPath: string): Promise<boolean> {
  return lockfile.check(targetPath, { stale: 30000 });
}
