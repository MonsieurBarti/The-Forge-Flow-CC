import { type Milestone } from "../../domain/entities/milestone.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import { type Result } from "../../domain/result.js";
interface CreateMilestoneInput {
    name: string;
    number: number;
}
interface CreateMilestoneDeps {
    milestoneStore: MilestoneStore;
    artifactStore: ArtifactStore;
    gitOps: GitOps;
    stateBranch?: StateBranchPort;
}
interface CreateMilestoneOutput {
    milestone: Milestone;
    branchName: string;
}
export declare const createMilestoneUseCase: (input: CreateMilestoneInput, deps: CreateMilestoneDeps) => Promise<Result<CreateMilestoneOutput, DomainError>>;
export {};
//# sourceMappingURL=create-milestone.d.ts.map