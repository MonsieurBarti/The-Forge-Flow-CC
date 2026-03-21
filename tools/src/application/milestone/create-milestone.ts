import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { createMilestone, formatMilestoneNumber, type Milestone } from '../../domain/entities/milestone.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

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

  // Create REQUIREMENTS.md if it doesn't exist
  if (!(await deps.artifactStore.exists('.tff/REQUIREMENTS.md'))) {
    await deps.artifactStore.write(
      '.tff/REQUIREMENTS.md',
      `# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
    );
  }

  return Ok({
    milestone,
    beadId: beadResult.data.id,
    branchName,
  });
};
