import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { type Result } from "../../domain/result.js";
interface GenerateStateInput {
    milestoneId: string;
}
interface GenerateStateDeps {
    milestoneStore: MilestoneStore;
    sliceStore: SliceStore;
    taskStore: TaskStore;
    artifactStore: ArtifactStore;
}
export declare const generateState: (input: GenerateStateInput, deps: GenerateStateDeps) => Promise<Result<void, DomainError>>;
export {};
//# sourceMappingURL=generate-state.d.ts.map