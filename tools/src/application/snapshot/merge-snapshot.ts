import { type BeadSnapshot, latestById } from '../../domain/value-objects/bead-snapshot.js';

export interface MergeConflict {
  id: string;
  field: string;
  ours: string;
  theirs: string;
}

export interface MergeResult {
  merged: string;
  conflicts: MergeConflict[];
}

function parseToMap(content: string): Map<string, BeadSnapshot> {
  const lines = content.split('\n').filter(Boolean);
  if (lines.length === 0) return new Map();
  const entries = lines.map((l) => JSON.parse(l) as BeadSnapshot);
  const latest = latestById(entries);
  const map = new Map<string, BeadSnapshot>();
  for (const e of latest) map.set(e.id, e);
  return map;
}

function unionArray(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}

function mergeEntry(
  id: string,
  base: BeadSnapshot | undefined,
  ours: BeadSnapshot | undefined,
  theirs: BeadSnapshot | undefined,
  conflicts: MergeConflict[],
): BeadSnapshot {
  // If only one side has the entry, return it directly
  if (!ours && theirs) return theirs;
  if (!theirs && ours) return ours;
  if (!ours && !theirs) throw new Error(`mergeEntry called with no ours/theirs for ${id}`);

  const o = ours!;
  const t = theirs!;

  // Status: latest snapshot_ts wins
  const oursNewer = o.snapshot_ts >= t.snapshot_ts;
  const winner = oursNewer ? o : t;
  const status = winner.status;

  // Design: conflict if both changed from base
  const baseDesign = base?.design ?? '';
  const oursDesignChanged = o.design !== baseDesign;
  const theirsDesignChanged = t.design !== baseDesign;
  let design: string;
  if (oursDesignChanged && theirsDesignChanged && o.design !== t.design) {
    conflicts.push({ id, field: 'design', ours: o.design, theirs: t.design });
    // Use latest as the merged value, but still flag the conflict
    design = winner.design;
  } else if (theirsDesignChanged) {
    design = t.design;
  } else {
    design = o.design;
  }

  // Deps: union
  const deps = {
    blocks: unionArray(o.deps.blocks, t.deps.blocks),
    validates: unionArray(o.deps.validates, t.deps.validates),
  };

  // KVs: latest snapshot_ts per key (entity-level: use per-entry ts)
  const allKeys = new Set([...Object.keys(o.kvs), ...Object.keys(t.kvs)]);
  const kvs: Record<string, string> = {};
  for (const key of allKeys) {
    const inOurs = key in o.kvs;
    const inTheirs = key in t.kvs;
    if (inOurs && inTheirs) {
      kvs[key] = oursNewer ? o.kvs[key] : t.kvs[key];
    } else if (inOurs) {
      kvs[key] = o.kvs[key];
    } else {
      kvs[key] = t.kvs[key];
    }
  }

  return {
    id,
    label: winner.label,
    title: winner.title,
    status,
    design,
    deps,
    kvs,
    snapshot_ts: winner.snapshot_ts,
  };
}

export function mergeSnapshots(base: string, ours: string, theirs: string): MergeResult {
  const baseMap = parseToMap(base);
  const oursMap = parseToMap(ours);
  const theirsMap = parseToMap(theirs);

  const allIds = new Set([...baseMap.keys(), ...oursMap.keys(), ...theirsMap.keys()]);
  const conflicts: MergeConflict[] = [];
  const merged: BeadSnapshot[] = [];

  for (const id of allIds) {
    const b = baseMap.get(id);
    const o = oursMap.get(id);
    const t = theirsMap.get(id);

    // Deleted in one side: if existed in base and removed from one side, skip
    // For now, if present in either ours or theirs, merge it
    if (!o && !t) continue;

    merged.push(mergeEntry(id, b, o, t, conflicts));
  }

  const result = merged
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => JSON.stringify(e))
    .join('\n');

  return { merged: result, conflicts };
}
