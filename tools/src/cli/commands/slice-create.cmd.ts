import { createSliceUseCase } from '../../application/slice/create-slice.js';
import { isOk } from '../../domain/result.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { withBranchGuard } from '../with-branch-guard.js';

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

  return withBranchGuard(async ({ milestoneStore, sliceStore }) => {
    const artifactStore = new MarkdownArtifactAdapter(process.cwd());

    // Auto-detect active milestone (most recent open one)
    const milestonesResult = milestoneStore.listMilestones();
    if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
      return JSON.stringify({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'No milestone found. Run /tff:new-milestone first.' },
      });
    }
    // Use the last open milestone, or the last one if none are open
    const openMilestones = milestonesResult.data.filter((m) => m.status !== 'closed');
    const milestone =
      openMilestones.length > 0
        ? openMilestones[openMilestones.length - 1]
        : milestonesResult.data[milestonesResult.data.length - 1];
    const milestoneId = milestone.id;

    const result = await createSliceUseCase(
      { milestoneId, title: name },
      { milestoneStore, sliceStore, artifactStore },
    );

    if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
