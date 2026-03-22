import type { DomainError } from '../../domain/errors/domain-error.js';
import { createDomainError } from '../../domain/errors/domain-error.js';
import type { BeadStore } from '../../domain/ports/bead-store.port.js';
import type { Result } from '../../domain/result.js';
import { Err, isOk, Ok } from '../../domain/result.js';
import {
  type BeadSnapshot,
  BeadSnapshotSchema,
  createSnapshot,
  latestById,
} from '../../domain/value-objects/bead-snapshot.js';

export interface SerializeSnapshotInput {
  beadStore: BeadStore;
  existingSnapshot?: string;
}

function hasChanged(current: BeadSnapshot, existing: BeadSnapshot): boolean {
  if (current.status !== existing.status) return true;
  if (current.design !== existing.design) return true;
  if (JSON.stringify(current.deps) !== JSON.stringify(existing.deps)) return true;
  if (JSON.stringify(current.kvs) !== JSON.stringify(existing.kvs)) return true;
  return false;
}

function parseExistingSnapshot(raw: string): BeadSnapshot[] {
  const lines = raw.split('\n').filter(Boolean);
  const entries: BeadSnapshot[] = [];
  for (const line of lines) {
    const parsed = BeadSnapshotSchema.parse(JSON.parse(line));
    entries.push(parsed);
  }
  return latestById(entries);
}

export async function serializeSnapshot(input: SerializeSnapshotInput): Promise<Result<string, DomainError>> {
  const listResult = await input.beadStore.list({});
  if (!isOk(listResult)) return listResult;

  const beads = listResult.data;
  if (beads.length === 0) return Ok('');

  const snapshots = beads.map(createSnapshot);

  if (!input.existingSnapshot) {
    const jsonl = snapshots.map((s) => JSON.stringify(s)).join('\n');
    return Ok(jsonl);
  }

  try {
    const existing = parseExistingSnapshot(input.existingSnapshot);
    const existingMap = new Map(existing.map((e) => [e.id, e]));

    const changed = snapshots.filter((snap) => {
      const prev = existingMap.get(snap.id);
      if (!prev) return true;
      return hasChanged(snap, prev);
    });

    if (changed.length === 0) return Ok('');

    const jsonl = changed.map((s) => JSON.stringify(s)).join('\n');
    return Ok(jsonl);
  } catch (e) {
    return Err(
      createDomainError(
        'VALIDATION_ERROR',
        `Failed to parse existing snapshot: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}
