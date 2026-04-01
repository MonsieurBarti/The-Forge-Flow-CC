import lockfile from 'proper-lockfile';

/**
 * Acquire exclusive lock for restore operations.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export async function acquireRestoreLock(targetPath: string, timeoutMs = 5000): Promise<(() => Promise<void>) | null> {
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

export async function isLocked(targetPath: string): Promise<boolean> {
  return lockfile.check(targetPath, { stale: 30000 });
}
