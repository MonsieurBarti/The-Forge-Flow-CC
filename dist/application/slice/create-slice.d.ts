import type { Slice } from "../../domain/entities/slice.js";
import { type DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import { type Result } from "../../domain/result.js";
interface CreateSliceInput {
    milestoneId: string;
    title: string;
}
interface CreateSliceDeps {
    milestoneStore: MilestoneStore;
    sliceStore: SliceStore;
    artifactStore: ArtifactStore;
    stateBranch?: StateBranchPort;
}
interface CreateSliceOutput {
    slice: Slice;
}
export declare const createSliceUseCase: (input: CreateSliceInput, deps: CreateSliceDeps) => Promise<Result<CreateSliceOutput, DomainError>>;
export {};
//# sourceMappingURL=create-slice.d.ts.map