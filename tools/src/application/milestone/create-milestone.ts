import { createMilestone, formatMilestoneNumber, type Milestone } from '../../domain/entities/milestone.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import type { GitOps } from '../../domain/ports/git-ops.port.js';
import { isOk, Ok, type Result } from '../../domain/result.js';

interface CreateMilestoneInput {
  projectBeadId: string;
  name: string;
  number: number;
}

interface CreateMilestoneDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
  gitOps: GitOps;
}

interface CreateMilestoneOutput {
  milestone: Milestone;
  beadId: string;
  branchName: string;
}

export const createMilestoneUseCase = async (
  input: CreateMilestoneInput,
  deps: CreateMilestoneDeps,
): Promise<Result<CreateMilestoneOutput, DomainError>> => {
  const milestone = createMilestone({
    projectId: input.projectBeadId,
    name: input.name,
    number: input.number,
  });

  const branchName = `milestone/${formatMilestoneNumber(input.number)}`;

  // Create bead
  const beadResult = await deps.beadStore.create({
    label: 'tff:milestone',
    title: input.name,
    design: `Milestone ${formatMilestoneNumber(input.number)}: ${input.name}`,
    parentId: input.projectBeadId,
  });
  if (!isOk(beadResult)) return beadResult;

  // Create branch
  await deps.gitOps.createBranch(branchName, 'main');

  // Create milestone directory with REQUIREMENTS.md
  const milestoneDir = `.tff/milestones/${formatMilestoneNumber(input.number)}`;
  await deps.artifactStore.mkdir(`${milestoneDir}/slices`);
  await deps.artifactStore.write(
    `${milestoneDir}/REQUIREMENTS.md`,
    `# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
  );

  return Ok({
    milestone,
    beadId: beadResult.data.id,
    branchName,
  });
};
