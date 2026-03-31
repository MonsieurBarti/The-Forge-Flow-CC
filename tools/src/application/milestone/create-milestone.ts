import { formatMilestoneNumber, type Milestone } from '../../domain/entities/milestone.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { GitOps } from '../../domain/ports/git-ops.port.js';
import type { MilestoneStore } from '../../domain/ports/milestone-store.port.js';
import { isOk, Ok, type Result } from '../../domain/result.js';

interface CreateMilestoneInput {
  name: string;
  number: number;
}

interface CreateMilestoneDeps {
  milestoneStore: MilestoneStore;
  artifactStore: ArtifactStore;
  gitOps: GitOps;
}

interface CreateMilestoneOutput {
  milestone: Milestone;
  branchName: string;
}

export const createMilestoneUseCase = async (
  input: CreateMilestoneInput,
  deps: CreateMilestoneDeps,
): Promise<Result<CreateMilestoneOutput, DomainError>> => {
  const branchName = `milestone/${formatMilestoneNumber(input.number)}`;

  // Persist milestone in store
  const milestoneResult = deps.milestoneStore.createMilestone({
    number: input.number,
    name: input.name,
  });
  if (!isOk(milestoneResult)) return milestoneResult;

  const milestone = milestoneResult.data;

  // Create branch
  await deps.gitOps.createBranch(branchName, 'main');

  // Create milestone directory with REQUIREMENTS.md
  const milestoneDir = `.tff/milestones/${formatMilestoneNumber(input.number)}`;
  await deps.artifactStore.mkdir(`${milestoneDir}/slices`);
  await deps.artifactStore.write(
    `${milestoneDir}/REQUIREMENTS.md`,
    `# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
  );

  return Ok({ milestone, branchName });
};
