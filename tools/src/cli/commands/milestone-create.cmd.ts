import { createMilestoneUseCase } from '../../application/milestone/create-milestone.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const number = parseInt(args[1] ?? '1', 10);
  const projectBeadId = args[2] ?? '';

  if (!name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: milestone:create <name> [number] [project-bead-id]' } });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const gitOps = new GitCliAdapter(process.cwd());

  const result = await createMilestoneUseCase(
    { projectBeadId, name, number },
    { beadStore, artifactStore, gitOps },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
