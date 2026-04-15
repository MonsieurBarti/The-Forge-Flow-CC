import path from "node:path";
import { createClosableStateStores, createStateStores, } from "../infrastructure/adapters/sqlite/create-state-stores.js";
import { acquireSyncLock } from "../infrastructure/locking/tff-lock.js";
function resolveLockPath(dbPath) {
    return dbPath ?? path.join(process.cwd(), ".tff", "state.db");
}
export async function withSyncLock(fn, opts) {
    const lockPath = resolveLockPath(opts?.dbPath);
    const release = await acquireSyncLock(lockPath, 5000);
    if (release === null) {
        return { ok: true, data: { action: "skipped", reason: "Lock held by another process" } };
    }
    try {
        const stores = createStateStores(opts?.dbPath);
        return await fn(stores);
    }
    finally {
        await release();
    }
}
export async function withClosableSyncLock(fn, opts) {
    const lockPath = resolveLockPath(opts?.dbPath);
    const release = await acquireSyncLock(lockPath, 5000);
    if (release === null) {
        return { ok: true, data: { action: "skipped", reason: "Lock held by another process" } };
    }
    try {
        const stores = createClosableStateStores(opts?.dbPath);
        return await fn(stores);
    }
    finally {
        await release();
    }
}
//# sourceMappingURL=with-sync-lock.js.map