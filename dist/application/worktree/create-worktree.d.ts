import type { DomainError } from "../../domain/errors/domain-error.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { type Result } from "../../domain/result.js";
interface CreateWorktreeInput {
    sliceId: string;
    startPoint?: string;
}
interface CreateWorktreeDeps {
    gitOps: GitOps;
}
interface CreateWorktreeOutput {
    worktreePath: string;
    branchName: string;
}
export declare const createWorktreeUseCase: (input: CreateWorktreeInput, deps: CreateWorktreeDeps) => Promise<Result<CreateWorktreeOutput, DomainError>>;
export {};
//# sourceMappingURL=create-worktree.d.ts.map