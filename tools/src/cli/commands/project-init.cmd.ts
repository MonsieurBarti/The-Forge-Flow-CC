import { initProject } from '../../application/project/init-project.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const projectInitCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const vision = args.slice(1).join(' ') || name;
  if (!name) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: project:init <name> [vision]' } });
  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await initProject({ name, vision }, { beadStore, artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
