import { transitionSliceUseCase } from '../../application/lifecycle/transition-slice.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { type SliceStatus, SliceStatusSchema } from '../../domain/value-objects/slice-status.js';
import { isOk } from '../../domain/result.js';

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
  const [beadId, targetStatus] = args;
  if (!beadId || !targetStatus) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:transition <bead-id> <target-status>' } });
  }

  try {
    SliceStatusSchema.parse(targetStatus);
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: `Invalid status: ${targetStatus}` } });
  }

  const { store: beadStore } = await createBeadAdapter();

  // Read actual bead to get current status
  const beadResult = await beadStore.get(beadId);
  if (!isOk(beadResult)) {
    return JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: `Bead "${beadId}" not found` } });
  }

  const bead = beadResult.data;

  // Extract slice ID from bead design field (format: "Slice M01-S01: ...")
  const sliceIdMatch = bead.design?.match(/Slice (M\d+-S\d+)/);
  const sliceId = sliceIdMatch?.[1] ?? beadId;

  const slice = {
    id: bead.id,
    milestoneId: bead.parentId ?? '',
    name: bead.title,
    sliceId,
    status: bead.status as SliceStatus,
    createdAt: new Date(),
  };

  const result = await transitionSliceUseCase(
    { slice, beadId, targetStatus: targetStatus as SliceStatus },
    { beadStore },
  );

  if (isOk(result)) {
    // Auto-snapshot after successful transition
    try {
      const { snapshotSaveCmd } = await import('./snapshot-save.cmd.js');
      await snapshotSaveCmd([]);
    } catch { /* snapshot failure is non-blocking */ }

    // Auto-sync to Dolt remote if configured
    try {
      const { readFile } = await import('node:fs/promises');
      const { loadProjectSettings } = await import('../../domain/value-objects/project-settings.js');
      const { doltPush } = await import('../../infrastructure/adapters/dolt/dolt-sync.js');
      const raw = await readFile('.tff/settings.yaml', 'utf-8');
      const settings = loadProjectSettings(raw);
      if (settings.dolt?.['auto-sync'] && settings.dolt.remote) {
        await doltPush(settings.dolt.remote);
      }
    } catch { /* dolt sync failure is non-blocking */ }

    return JSON.stringify({ ok: true, data: { status: result.data.slice.status } });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
