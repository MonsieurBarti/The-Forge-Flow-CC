import { createMilestoneUseCase } from '../../application/milestone/create-milestone.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
  const name = args[0];

  if (!name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: milestone:create <name>' } });
  }

  const { store: beadStore } = await createBeadAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const gitOps = new GitCliAdapter(process.cwd());

  // Auto-detect project bead ID
  const projectResult = await beadStore.list({ label: 'tff:project' });
  if (!isOk(projectResult) || projectResult.data.length === 0) {
    return JSON.stringify({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'No tff project found. Run /tff:new first.' },
    });
  }
  const projectBeadId = projectResult.data[0].id;

  // Auto-number: find highest existing milestone number and increment
  const milestonesResult = await beadStore.list({ label: 'tff:milestone', includeAll: true });
  let maxMilestoneNumber = 0;
  if (isOk(milestonesResult)) {
    for (const m of milestonesResult.data) {
      const match = m.design?.match(/M(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxMilestoneNumber) maxMilestoneNumber = num;
      }
    }
  }
  const number = maxMilestoneNumber + 1;

  const result = await createMilestoneUseCase({ projectBeadId, name, number }, { beadStore, artifactStore, gitOps });

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
