import { createSliceUseCase } from '../../application/slice/create-slice.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
  const name = args[0];

  if (!name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:create <name>' } });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  // Auto-detect active milestone (most recent open one)
  const milestonesResult = await beadStore.list({ label: 'tff:milestone' });
  if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
    return JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'No milestone found. Run /tff:new-milestone first.' } });
  }
  // Use the last open milestone, or the last one if none are open
  const openMilestones = milestonesResult.data.filter((m) => m.status !== 'closed');
  const milestone = openMilestones.length > 0 ? openMilestones[0] : milestonesResult.data[0];
  const milestoneBeadId = milestone.id;

  // Detect milestone number from title (e.g., "Milestone M02: ..." → 2) or count
  const milestoneNumber = milestonesResult.data.indexOf(milestone) + 1;

  // Auto-number slice: count existing slices under this milestone + 1
  const slicesResult = await beadStore.list({ label: 'tff:slice', parentId: milestoneBeadId });
  const sliceNumber = isOk(slicesResult) ? slicesResult.data.length + 1 : 1;

  const result = await createSliceUseCase(
    { milestoneBeadId, name, milestoneNumber, sliceNumber },
    { beadStore, artifactStore },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
