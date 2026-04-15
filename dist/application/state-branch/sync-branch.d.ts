import type { DomainError } from "../../domain/errors/domain-error.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import type { Result } from "../../domain/result.js";
interface SyncBranchInput {
    codeBranch: string;
    message: string;
}
interface SyncBranchDeps {
    stateBranch: StateBranchPort;
}
export declare const syncBranchUseCase: (input: SyncBranchInput, deps: SyncBranchDeps) => Promise<Result<void, DomainError>>;
export {};
//# sourceMappingURL=sync-branch.d.ts.map