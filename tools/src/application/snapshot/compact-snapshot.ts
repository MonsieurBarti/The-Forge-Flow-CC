import { latestById, type BeadSnapshot } from '../../domain/value-objects/bead-snapshot.js';

export function compactSnapshot(content: string): string {
  const lines = content.split('\n').filter(Boolean);
  if (lines.length === 0) return '';
  const entries = lines.map(l => JSON.parse(l) as BeadSnapshot);
  const latest = latestById(entries);
  return latest
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => JSON.stringify(e))
    .join('\n');
}
