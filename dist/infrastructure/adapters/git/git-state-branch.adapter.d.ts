import type { DomainError } from "../../../domain/errors/domain-error.js";
import type { GitOps } from "../../../domain/ports/git-ops.port.js";
import type { StateBranchPort } from "../../../domain/ports/state-branch.port.js";
import type { StateExporter, StateImporter } from "../../../domain/ports/state-exporter.port.js";
import { type Result } from "../../../domain/result.js";
import type { MergeResult } from "../../../domain/value-objects/merge-result.js";
import type { RestoreResult } from "../../../domain/value-objects/restore-result.js";
export declare class GitStateBranchAdapter implements StateBranchPort {
    private readonly gitOps;
    private readonly repoRoot;
    private readonly exporter?;
    private readonly importer?;
    private resolvedDefaultBranch;
    constructor(gitOps: GitOps, repoRoot: string, exporter?: StateExporter | undefined, importer?: StateImporter | undefined);
    private getDefaultBranch;
    private stateBranch;
    private tmpWorktreePath;
    private writeBranchMeta;
    private writeGitignore;
    createRoot(): Promise<Result<void, DomainError>>;
    exists(codeBranch: string): Promise<Result<boolean, DomainError>>;
    fork(codeBranch: string, parentStateBranch: string): Promise<Result<void, DomainError>>;
    sync(codeBranch: string, message: string): Promise<Result<void, DomainError>>;
    restore(codeBranch: string, targetDir: string): Promise<Result<RestoreResult | null, DomainError>>;
    merge(childCodeBranch: string, parentCodeBranch: string, sliceId: string): Promise<Result<MergeResult, DomainError>>;
    /**
     * Parse a JSON state snapshot and convert ISO date strings back to Date objects.
     * Mirrors the date conversion logic in restore() for consistency.
     */
    private parseSnapshotWithDates;
    deleteBranch(codeBranch: string): Promise<Result<void, DomainError>>;
}
//# sourceMappingURL=git-state-branch.adapter.d.ts.map