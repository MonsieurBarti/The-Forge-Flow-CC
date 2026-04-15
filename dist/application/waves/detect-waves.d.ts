import { type DomainError } from "../../domain/errors/domain-error.js";
import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { type Result } from "../../domain/result.js";
import type { Wave } from "../../domain/value-objects/wave.js";
interface TaskDep {
    id: string;
    dependsOn: string[];
}
export declare const detectWaves: (tasks: TaskDep[]) => Result<Wave[], DomainError>;
export declare const detectWavesFromStores: (deps: {
    taskStore: TaskStore;
    dependencyStore: DependencyStore;
}, sliceId: string) => Result<Wave[], DomainError>;
export {};
//# sourceMappingURL=detect-waves.d.ts.map