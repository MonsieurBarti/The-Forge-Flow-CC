import { createMilestoneUseCase } from '../../application/milestone/create-milestone.js';
import { isOk } from '../../domain/result.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
  const name = args[0];

  if (!name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: milestone:create <name>' } });
  }

  const { milestoneStore } = createStateStores();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const gitOps = new GitCliAdapter(process.cwd());

  // Auto-number: count existing milestones and increment
  const milestonesResult = milestoneStore.listMilestones();
  if (!isOk(milestonesResult)) {
    return JSON.stringify({ ok: false, error: milestonesResult.error });
  }
  const number = milestonesResult.data.length + 1;

  const result = await createMilestoneUseCase({ name, number }, { milestoneStore, artifactStore, gitOps });

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
