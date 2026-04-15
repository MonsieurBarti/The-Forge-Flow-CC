import { type ClosableStateStores, type StateStores } from "../infrastructure/adapters/sqlite/create-state-stores.js";
export interface SyncLockResult {
    ok: true;
    data: {
        action: "skipped";
        reason: string;
    };
}
export declare function withSyncLock<T>(fn: (stores: StateStores) => Promise<T>, opts?: {
    dbPath?: string;
}): Promise<T | SyncLockResult>;
export declare function withClosableSyncLock<T>(fn: (stores: ClosableStateStores) => Promise<T>, opts?: {
    dbPath?: string;
}): Promise<T | SyncLockResult>;
//# sourceMappingURL=with-sync-lock.d.ts.map