import { createSliceUseCase } from '../../application/slice/create-slice.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
  // Parse --title flag or fall back to positional arg
  let name: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && i + 1 < args.length) {
      name = args[i + 1];
      break;
    }
    if (!args[i].startsWith('--')) {
      name = args[i];
      break;
    }
    // Skip unknown flags with values (e.g. --milestone M01)
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      i++;
    }
  }

  if (!name) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: slice:create <name> or slice:create --title <name>' },
    });
  }

  const { store: beadStore } = await createBeadAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  // Auto-detect active milestone (most recent open one)
  const milestonesResult = await beadStore.list({ label: 'tff:milestone' });
  if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
    return JSON.stringify({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'No milestone found. Run /tff:new-milestone first.' },
    });
  }
  // Use the last open milestone, or the last one if none are open
  const openMilestones = milestonesResult.data.filter((m) => m.status !== 'closed');
  const milestone = openMilestones.length > 0 ? openMilestones[0] : milestonesResult.data[0];
  const milestoneBeadId = milestone.id;

  // Detect milestone number from design field (e.g., "Milestone M02: ..." → 2)
  const milestoneMatch = milestone.design?.match(/M(\d+)/);
  const milestoneNumber = milestoneMatch ? parseInt(milestoneMatch[1], 10) : 1;

  // Auto-number slice: find highest existing slice number and increment from there
  const slicesResult = await beadStore.list({ label: 'tff:slice', parentId: milestoneBeadId, includeAll: true });
  let maxSliceNumber = 0;
  if (isOk(slicesResult)) {
    for (const s of slicesResult.data) {
      const match = s.design?.match(/Slice M\d+-S(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSliceNumber) maxSliceNumber = num;
      }
    }
  }
  const sliceNumber = maxSliceNumber + 1;

  const result = await createSliceUseCase(
    { milestoneBeadId, name, milestoneNumber, sliceNumber },
    { beadStore, artifactStore },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
