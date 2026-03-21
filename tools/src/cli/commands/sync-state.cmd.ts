import { generateState } from '../../application/sync/generate-state.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const syncStateCmd = async (args: string[]): Promise<string> => {
  const [milestoneId, milestoneName] = args;
  if (!milestoneId) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: sync:state <milestone-bead-id> [milestone-name]' } });
  }
  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await generateState(
    { milestoneId, milestoneName: milestoneName ?? 'Milestone' },
    { beadStore, artifactStore },
  );
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
