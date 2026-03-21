import { saveCheckpoint } from '../../application/checkpoint/save-checkpoint.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const checkpointSaveCmd = async (args: string[]): Promise<string> => {
  const [dataJson] = args;
  if (!dataJson) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: checkpoint:save <checkpoint-data-json>' } });
  }
  try {
    const data = JSON.parse(dataJson);
    const artifactStore = new MarkdownArtifactAdapter(process.cwd());
    const result = await saveCheckpoint(data, { artifactStore });
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON input' } });
  }
};
