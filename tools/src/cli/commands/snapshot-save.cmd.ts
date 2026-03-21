import { isOk } from '../../domain/result.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { serializeSnapshot } from '../../application/snapshot/serialize-snapshot.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SNAPSHOT_PATH = '.tff/beads-snapshot.jsonl';

export async function snapshotSaveCmd(args: string[]) {
  const beadStore = new BdCliAdapter();
  let existingSnapshot = '';
  try {
    existingSnapshot = await readFile(SNAPSHOT_PATH, 'utf-8');
  } catch { /* no existing snapshot */ }

  const result = await serializeSnapshot({ beadStore, existingSnapshot });
  if (!isOk(result)) return JSON.stringify({ ok: false, error: result.error });

  if (result.data) {
    await mkdir('.tff', { recursive: true });
    const content = existingSnapshot ? existingSnapshot + '\n' + result.data : result.data;
    await writeFile(SNAPSHOT_PATH, content, 'utf-8');
  }

  const lines = result.data.split('\n').filter(Boolean);
  return JSON.stringify({ ok: true, data: { path: SNAPSHOT_PATH, entries: lines.length } });
}
