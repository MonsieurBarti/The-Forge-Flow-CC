import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { Dependency } from "../value-objects/dependency.js";
export interface DependencyStore {
    addDependency(fromId: string, toId: string, type: "blocks"): Result<void, DomainError>;
    removeDependency(fromId: string, toId: string): Result<void, DomainError>;
    getDependencies(taskId: string): Result<Dependency[], DomainError>;
}
//# sourceMappingURL=dependency-store.port.d.ts.map