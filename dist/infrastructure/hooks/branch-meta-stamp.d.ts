import { type BranchMeta } from "../../domain/value-objects/branch-meta.js";
export declare function readLocalStamp(tffDir: string): BranchMeta | null;
export declare function writeLocalStamp(tffDir: string, meta: Omit<BranchMeta, "restoredAt">): void;
export declare function writeSyntheticStamp(tffDir: string, codeBranch: string): void;
//# sourceMappingURL=branch-meta-stamp.d.ts.map