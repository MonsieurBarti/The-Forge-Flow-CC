import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { hydrateSnapshot } from '../../application/snapshot/hydrate-snapshot.js';
import { readFile } from 'node:fs/promises';

const SNAPSHOT_PATH = '.tff/beads-snapshot.jsonl';

export async function snapshotLoadCmd(args: string[]) {
  const { store: beadStore } = await createBeadAdapter();
  await beadStore.init();

  let snapshotContent = '';
  try {
    snapshotContent = await readFile(SNAPSHOT_PATH, 'utf-8');
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'No snapshot at ' + SNAPSHOT_PATH } });
  }

  const result = await hydrateSnapshot({ beadStore, snapshotContent });
  if (!isOk(result)) return JSON.stringify({ ok: false, error: result.error });

  return JSON.stringify({ ok: true, data: result.data });
}
