import { initProject } from '../../application/project/init-project.js';
import { isOk } from '../../domain/result.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';

export const projectInitCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const vision = args.slice(1).join(' ') || name;
  if (!name)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: project:init <name> [vision]' },
    });
  const { projectStore } = createStateStores();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  const result = await initProject({ name, vision }, { projectStore, artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
