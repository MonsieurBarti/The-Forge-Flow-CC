import type { DomainError } from "../../domain/errors/domain-error.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { Result } from "../../domain/result.js";
interface ListWorktreesDeps {
    gitOps: GitOps;
}
export declare const listWorktreesUseCase: (deps: ListWorktreesDeps) => Promise<Result<string[], DomainError>>;
export {};
//# sourceMappingURL=list-worktrees.d.ts.map