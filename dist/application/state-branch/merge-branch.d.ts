import type { DomainError } from "../../domain/errors/domain-error.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import { type Result } from "../../domain/result.js";
import type { MergeResult } from "../../domain/value-objects/merge-result.js";
interface MergeBranchInput {
    childCodeBranch: string;
    parentCodeBranch: string;
    sliceId: string;
}
interface MergeBranchDeps {
    stateBranch: StateBranchPort;
}
export declare const mergeBranchUseCase: (input: MergeBranchInput, deps: MergeBranchDeps) => Promise<Result<MergeResult, DomainError>>;
export {};
//# sourceMappingURL=merge-branch.d.ts.map