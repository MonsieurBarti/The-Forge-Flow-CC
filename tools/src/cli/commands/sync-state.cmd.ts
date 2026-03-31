import { generateState } from '../../application/sync/generate-state.js';
import { isOk } from '../../domain/result.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';

export const syncStateCmd = async (args: string[]): Promise<string> => {
  const [milestoneId] = args;
  if (!milestoneId) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: sync:state <milestone-id>' },
    });
  }
  const { milestoneStore, sliceStore, taskStore } = createStateStores();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await generateState({ milestoneId }, { milestoneStore, sliceStore, taskStore, artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
