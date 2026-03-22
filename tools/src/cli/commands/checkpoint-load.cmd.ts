import { loadCheckpoint } from '../../application/checkpoint/load-checkpoint.js';
import { isOk } from '../../domain/result.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';

export const checkpointLoadCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: checkpoint:load <slice-id>' } });
  }
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await loadCheckpoint(sliceId, { artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
