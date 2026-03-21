import { z } from 'zod';
import type { BeadData } from '../ports/bead-store.port.js';
import { BeadLabelSchema } from './bead-label.js';

export const BeadSnapshotSchema = z.object({
  id: z.string().min(1),
  label: BeadLabelSchema,
  title: z.string(),
  status: z.string(),
  design: z.string().optional().default(''),
  deps: z
    .object({
      blocks: z.array(z.string()).default([]),
      validates: z.array(z.string()).default([]),
    })
    .default({ blocks: [], validates: [] }),
  kvs: z.record(z.string(), z.string()).default({}),
  snapshot_ts: z.string(),
});

export type BeadSnapshot = z.infer<typeof BeadSnapshotSchema>;

export function createSnapshot(bead: BeadData): BeadSnapshot {
  return {
    id: bead.id,
    label: bead.label as BeadSnapshot['label'],
    title: bead.title,
    status: bead.status,
    design: bead.design ?? '',
    deps: { blocks: bead.blocks ?? [], validates: bead.validates ?? [] },
    kvs: bead.metadata ?? {},
    snapshot_ts: new Date().toISOString(),
  };
}

export function latestById(entries: BeadSnapshot[]): BeadSnapshot[] {
  const map = new Map<string, BeadSnapshot>();
  for (const entry of entries) {
    const existing = map.get(entry.id);
    if (!existing || entry.snapshot_ts > existing.snapshot_ts) {
      map.set(entry.id, entry);
    }
  }
  return [...map.values()];
}
