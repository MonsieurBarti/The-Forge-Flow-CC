import { type Project } from "../../domain/entities/project.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { ProjectStore } from "../../domain/ports/project-store.port.js";
import type { StateBranchPort } from "../../domain/ports/state-branch.port.js";
import { type Result } from "../../domain/result.js";
interface InitProjectInput {
    name: string;
    vision: string;
}
interface InitProjectDeps {
    projectStore: ProjectStore;
    artifactStore: ArtifactStore;
    stateBranch?: StateBranchPort;
}
interface InitProjectOutput {
    project: Project;
}
export declare const initProject: (input: InitProjectInput, deps: InitProjectDeps) => Promise<Result<InitProjectOutput, DomainError>>;
export {};
//# sourceMappingURL=init-project.d.ts.map