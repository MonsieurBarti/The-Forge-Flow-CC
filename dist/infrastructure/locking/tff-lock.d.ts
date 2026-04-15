/**
 * Acquire exclusive lock for restore operations.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export declare function acquireRestoreLock(targetPath: string, timeoutMs?: number): Promise<(() => Promise<void>) | null>;
/**
 * Acquire exclusive lock for sync operations.
 * Targets the same file as acquireRestoreLock to ensure mutual exclusion.
 * Returns release function, or null if lock couldn't be acquired within timeout.
 */
export declare function acquireSyncLock(targetPath: string, timeoutMs?: number): Promise<(() => Promise<void>) | null>;
export declare function isLocked(targetPath: string): Promise<boolean>;
//# sourceMappingURL=tff-lock.d.ts.map