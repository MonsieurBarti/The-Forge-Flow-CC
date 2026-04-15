import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { type Result } from "../../domain/result.js";
export interface CheckpointData {
    sliceId: string;
    baseCommit: string;
    currentWave: number;
    completedWaves: number[];
    completedTasks: string[];
    executorLog: Array<{
        taskRef: string;
        agent: string;
    }>;
}
interface SaveCheckpointDeps {
    artifactStore: ArtifactStore;
}
export declare const saveCheckpoint: (data: CheckpointData, deps: SaveCheckpointDeps) => Promise<Result<void, DomainError>>;
export {};
//# sourceMappingURL=save-checkpoint.d.ts.map