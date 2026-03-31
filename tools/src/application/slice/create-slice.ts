import type { Slice } from '../../domain/entities/slice.js';
import { createDomainError, type DomainError } from '../../domain/errors/domain-error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { MilestoneStore } from '../../domain/ports/milestone-store.port.js';
import type { SliceStore } from '../../domain/ports/slice-store.port.js';
import { Err, isOk, Ok, type Result } from '../../domain/result.js';

interface CreateSliceInput {
  milestoneId: string;
  title: string;
}

interface CreateSliceDeps {
  milestoneStore: MilestoneStore;
  sliceStore: SliceStore;
  artifactStore: ArtifactStore;
}

interface CreateSliceOutput {
  slice: Slice;
}

export const createSliceUseCase = async (
  input: CreateSliceInput,
  deps: CreateSliceDeps,
): Promise<Result<CreateSliceOutput, DomainError>> => {
  const milestoneResult = deps.milestoneStore.getMilestone(input.milestoneId);
  if (!isOk(milestoneResult)) return milestoneResult;
  const milestone = milestoneResult.data;
  if (!milestone) {
    return Err(createDomainError('NOT_FOUND', `Milestone "${input.milestoneId}" not found`));
  }

  const existingSlicesResult = deps.sliceStore.listSlices(input.milestoneId);
  if (!isOk(existingSlicesResult)) return existingSlicesResult;
  const sliceNumber = existingSlicesResult.data.length + 1;

  const sliceResult = deps.sliceStore.createSlice({
    milestoneId: input.milestoneId,
    number: sliceNumber,
    title: input.title,
  });
  if (!isOk(sliceResult)) return sliceResult;
  const slice = sliceResult.data;

  // Create slice directory with stub PLAN.md
  const milestoneDir = `.tff/milestones/${input.milestoneId}`;
  const sliceDir = `${milestoneDir}/slices/${slice.id}`;
  await deps.artifactStore.mkdir(sliceDir);
  await deps.artifactStore.write(
    `${sliceDir}/PLAN.md`,
    `# Plan — ${slice.id}: ${input.title}\n\n_Plan will be defined during /tff:plan._\n`,
  );

  return Ok({ slice });
};
