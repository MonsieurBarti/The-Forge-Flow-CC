import { type DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { type Result } from "../../domain/result.js";
import type { CheckpointData } from "./save-checkpoint.js";
interface LoadCheckpointDeps {
    artifactStore: ArtifactStore;
}
export declare const loadCheckpoint: (sliceId: string, deps: LoadCheckpointDeps) => Promise<Result<CheckpointData, DomainError>>;
export {};
//# sourceMappingURL=load-checkpoint.d.ts.map