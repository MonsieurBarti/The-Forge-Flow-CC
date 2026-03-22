import { reconcileState } from '../../application/sync/reconcile-state.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';

export const syncReconcileCmd = async (args: string[]): Promise<string> => {
  const [milestoneId, milestoneName] = args;
  if (!milestoneId) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: sync:reconcile <milestone-bead-id> [milestone-name]' },
    });
  }

  const { store: beadStore } = await createBeadAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  const result = await reconcileState(
    { milestoneId, milestoneName: milestoneName ?? 'Milestone' },
    { beadStore, artifactStore },
  );

  if (isOk(result)) {
    // Compact snapshot after reconciliation
    try {
      const { readFile, writeFile } = await import('node:fs/promises');
      const { compactSnapshot } = await import('../../application/snapshot/compact-snapshot.js');
      const content = await readFile('.tff/beads-snapshot.jsonl', 'utf-8');
      const compacted = compactSnapshot(content);
      await writeFile('.tff/beads-snapshot.jsonl', compacted, 'utf-8');
    } catch {
      /* compact failure is non-blocking */
    }

    return JSON.stringify({ ok: true, data: result.data });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
