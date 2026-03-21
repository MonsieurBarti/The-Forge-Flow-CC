import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { createSlice, type Slice } from '../../domain/entities/slice.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface CreateSliceInput {
  milestoneBeadId: string;
  name: string;
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
    name: input.name,
    milestoneNumber: input.milestoneNumber,
    sliceNumber: input.sliceNumber,
  });

  const beadResult = await deps.beadStore.create({
    label: 'tff:slice',
    title: input.name,
    design: `Slice ${slice.sliceId}: ${input.name}`,
    parentId: input.milestoneBeadId,
  });
  if (!isOk(beadResult)) return beadResult;

  // Create slice directory with stub PLAN.md
  const sliceDir = `.tff/slices/${slice.sliceId}`;
  await deps.artifactStore.mkdir(sliceDir);
  await deps.artifactStore.write(
    `${sliceDir}/PLAN.md`,
    `# Plan — ${slice.sliceId}: ${input.name}\n\n_Plan will be defined during /tff:plan._\n`,
  );

  return Ok({ slice, beadId: beadResult.data.id });
};
