import { createSlice, type Slice } from '../../domain/entities/slice.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import { isOk, Ok, type Result } from '../../domain/result.js';

interface CreateSliceInput {
  milestoneBeadId: string;
  title: string;
  milestoneNumber: number;
  sliceNumber: number;
}

interface CreateSliceDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

interface CreateSliceOutput {
  slice: Slice;
  beadId: string;
}

export const createSliceUseCase = async (
  input: CreateSliceInput,
  deps: CreateSliceDeps,
): Promise<Result<CreateSliceOutput, DomainError>> => {
  const slice = createSlice({
    milestoneId: input.milestoneBeadId,
    title: input.title,
    milestoneNumber: input.milestoneNumber,
    sliceNumber: input.sliceNumber,
  });

  const beadResult = await deps.beadStore.create({
    label: 'tff:slice',
    title: input.title,
    design: `Slice ${slice.id}: ${input.title}`,
    parentId: input.milestoneBeadId,
  });
  if (!isOk(beadResult)) return beadResult;

  // Create slice directory with stub PLAN.md
  const milestoneDir = `.tff/milestones/M${String(input.milestoneNumber).padStart(2, '0')}`;
  const sliceDir = `${milestoneDir}/slices/${slice.id}`;
  await deps.artifactStore.mkdir(sliceDir);
  await deps.artifactStore.write(
    `${sliceDir}/PLAN.md`,
    `# Plan — ${slice.id}: ${input.title}\n\n_Plan will be defined during /tff:plan._\n`,
  );

  return Ok({ slice, beadId: beadResult.data.id });
};
