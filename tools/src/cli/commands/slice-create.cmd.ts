import { createSliceUseCase } from '../../application/slice/create-slice.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
  const [milestoneBeadId, name, msNum, slNum] = args;
  if (!milestoneBeadId || !name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:create <milestone-bead-id> <name> [milestone-number] [slice-number]' } });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await createSliceUseCase(
    { milestoneBeadId, name, milestoneNumber: parseInt(msNum ?? '1', 10), sliceNumber: parseInt(slNum ?? '1', 10) },
    { beadStore, artifactStore },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
