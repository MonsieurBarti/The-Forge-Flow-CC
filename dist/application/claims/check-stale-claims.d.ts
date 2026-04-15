import type { Task } from "../../domain/entities/task.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { type Result } from "../../domain/result.js";
interface CheckStaleClaimsInput {
    ttlMinutes?: number;
}
interface CheckStaleClaimsDeps {
    taskStore: TaskStore;
}
interface CheckStaleClaimsOutput {
    staleClaims: Task[];
}
export declare const checkStaleClaims: (input: CheckStaleClaimsInput, deps: CheckStaleClaimsDeps) => Promise<Result<CheckStaleClaimsOutput, DomainError>>;
export {};
//# sourceMappingURL=check-stale-claims.d.ts.map