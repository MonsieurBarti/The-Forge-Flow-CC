import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mergeSnapshots } from '../../application/snapshot/merge-snapshot.js';

export async function snapshotMergeCmd(args: string[]) {
  const [basePath, oursPath, theirsPath] = args;

  if (!basePath || !oursPath || !theirsPath) {
    return JSON.stringify({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Usage: snapshot:merge <base> <ours> <theirs>' } });
  }

  const [base, ours, theirs] = await Promise.all([
    readFile(basePath, 'utf-8').catch(() => ''),
    readFile(oursPath, 'utf-8').catch(() => ''),
    readFile(theirsPath, 'utf-8').catch(() => ''),
  ]);

  const result = mergeSnapshots(base, ours, theirs);

  // Write merged result to "ours" (git convention)
  await writeFile(oursPath, result.merged, 'utf-8');

  // Write conflicts if any
  if (result.conflicts.length > 0) {
    await mkdir('.tff', { recursive: true });
    const conflictMd = result.conflicts.map(c => [
      `## Conflict: ${c.id}`,
      '### Ours',
      '```', c.ours, '```',
      '### Theirs',
      '```', c.theirs, '```',
      '### Resolution needed',
      'Choose one version or merge manually, then run `/tff:sync` to hydrate beads.',
    ].join('\n')).join('\n\n---\n\n');

    await writeFile('.tff/CONFLICT.md', conflictMd, 'utf-8');

    // Signal conflict to git (merge driver protocol requires exit 1)
    console.error(JSON.stringify({ ok: false, error: { code: 'SYNC_CONFLICT', message: `${result.conflicts.length} design conflict(s) written to .tff/CONFLICT.md` } }));
    process.exit(1);
  }

  return JSON.stringify({ ok: true, data: { merged: result.merged.split('\n').filter(Boolean).length } });
}
