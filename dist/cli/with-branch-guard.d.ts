import { type ClosableStateStores, type StateStores } from "../infrastructure/adapters/sqlite/create-state-stores.js";
export declare function withBranchGuard<T>(fn: (stores: StateStores) => Promise<T>, opts?: {
    dbPath?: string;
}): Promise<T>;
export declare function withClosableBranchGuard<T>(fn: (stores: ClosableStateStores) => Promise<T>, opts?: {
    dbPath?: string;
}): Promise<T>;
//# sourceMappingURL=with-branch-guard.d.ts.map