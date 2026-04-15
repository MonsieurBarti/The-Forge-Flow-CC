export class BranchMismatchError extends Error {
    expectedBranch;
    currentBranch;
    stampPath;
    repairHint;
    constructor(expectedBranch, currentBranch, stampPath = ".tff/branch-meta.json") {
        super(`Branch mismatch: ${stampPath} shows state for "${expectedBranch}" but HEAD is "${currentBranch}". ` +
            `Run /tff:repair to reconcile or switch to the correct branch.`);
        this.expectedBranch = expectedBranch;
        this.currentBranch = currentBranch;
        this.stampPath = stampPath;
        this.name = "BranchMismatchError";
        this.repairHint = `/tff:repair (or git checkout ${expectedBranch})`;
    }
}
//# sourceMappingURL=branch-mismatch.error.js.map