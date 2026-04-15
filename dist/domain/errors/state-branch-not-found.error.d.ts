export declare const stateBranchNotFoundError: (codeBranch: string) => {
    code: "PROJECT_EXISTS" | "INVALID_TRANSITION" | "GIT_CONFLICT" | "FRESH_REVIEWER_VIOLATION" | "NOT_FOUND" | "VALIDATION_ERROR" | "STALE_CLAIM" | "WRITE_FAILURE" | "ALREADY_CLAIMED" | "VERSION_MISMATCH" | "HAS_OPEN_CHILDREN" | "SYNC_FAILED" | "MERGE_CONFLICT" | "CORRUPTED_STATE" | "STATE_BRANCH_NOT_FOUND" | "JOURNAL_WRITE_FAILED" | "JOURNAL_READ_FAILED" | "JOURNAL_REPLAY_INCONSISTENT";
    message: string;
    context?: Record<string, unknown> | undefined;
};
//# sourceMappingURL=state-branch-not-found.error.d.ts.map