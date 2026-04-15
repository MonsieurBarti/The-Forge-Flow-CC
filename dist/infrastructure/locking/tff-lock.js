import lockfile from "proper-lockfile";
/**
 * Internal lock acquisition helper.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
async function acquireLock(targetPath, timeoutMs) {
    try {
        const release = await lockfile.lock(targetPath, {
            retries: { retries: Math.ceil(timeoutMs / 200), factor: 1, minTimeout: 200 },
            stale: 30000,
        });
        return release;
    }
    catch {
        return null;
    }
}
/**
 * Acquire exclusive lock for restore operations.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export async function acquireRestoreLock(targetPath, timeoutMs = 5000) {
    return acquireLock(targetPath, timeoutMs);
}
/**
 * Acquire exclusive lock for sync operations.
 * Targets the same file as acquireRestoreLock to ensure mutual exclusion.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export async function acquireSyncLock(targetPath, timeoutMs = 5000) {
    return acquireLock(targetPath, timeoutMs);
}
export async function isLocked(targetPath) {
    return lockfile.check(targetPath, { stale: 30000 });
}
//# sourceMappingURL=tff-lock.js.map