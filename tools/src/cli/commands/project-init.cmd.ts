import { initProject } from '../../application/project/init-project.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';

export const projectInitCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const vision = args.slice(1).join(' ') || name;
  if (!name)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: project:init <name> [vision]' },
    });
  const { store: beadStore } = await createBeadAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  // Hydrate from snapshot if available (clone-and-go)
  try {
    const { readFile } = await import('node:fs/promises');
    const snapshotContent = await readFile('.tff/beads-snapshot.jsonl', 'utf-8');
    if (snapshotContent.trim()) {
      const { hydrateSnapshot } = await import('../../application/snapshot/hydrate-snapshot.js');
      await hydrateSnapshot({ beadStore, snapshotContent });
    }
  } catch {
    /* no snapshot file = fresh project */
  }

  const result = await initProject({ name, vision }, { beadStore, artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
