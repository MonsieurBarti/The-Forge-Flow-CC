export declare class BranchMismatchError extends Error {
    readonly expectedBranch: string;
    readonly currentBranch: string;
    readonly stampPath: string;
    readonly repairHint: string;
    constructor(expectedBranch: string, currentBranch: string, stampPath?: string);
}
//# sourceMappingURL=branch-mismatch.error.d.ts.map