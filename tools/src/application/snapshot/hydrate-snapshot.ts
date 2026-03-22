import { createDomainError, type DomainError } from '../../domain/errors/domain-error.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import { Err, Ok, type Result } from '../../domain/result.js';
import type { BeadLabel } from '../../domain/value-objects/bead-label.js';
import { BeadSnapshotSchema, latestById } from '../../domain/value-objects/bead-snapshot.js';

export async function hydrateSnapshot(deps: {
  beadStore: BeadStore;
  snapshotContent: string;
}): Promise<Result<{ created: number; skipped: number }, DomainError>> {
  const { beadStore, snapshotContent } = deps;
  const lines = snapshotContent.split('\n').filter(Boolean);

  if (lines.length === 0) return Ok({ created: 0, skipped: 0 });

  const parsed = [];
  for (const line of lines) {
    const result = BeadSnapshotSchema.safeParse(JSON.parse(line));
    if (!result.success) {
      return Err(createDomainError('VALIDATION_ERROR', `Invalid snapshot line: ${result.error.message}`));
    }
    parsed.push(result.data);
  }

  const latest = latestById(parsed);

  let created = 0;
  let skipped = 0;

  for (const snap of latest) {
    const createResult = await beadStore.create({
      label: snap.label as BeadLabel,
      title: snap.title,
    });

    if (!createResult.ok) {
      skipped++;
      continue;
    }

    const beadId = createResult.data.id;

    if (snap.status !== 'open') {
      await beadStore.updateStatus(beadId, snap.status);
    }

    if (snap.design) {
      await beadStore.updateDesign(beadId, snap.design);
    }

    created++;
  }

  return Ok({ created, skipped });
}
