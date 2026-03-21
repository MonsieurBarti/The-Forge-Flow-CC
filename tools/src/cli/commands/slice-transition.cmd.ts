import { transitionSliceUseCase } from '../../application/lifecycle/transition-slice.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { type SliceStatus, SliceStatusSchema } from '../../domain/value-objects/slice-status.js';
import { isOk } from '../../domain/result.js';

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
  const [beadId, targetStatus, currentStatus, sliceId] = args;
  if (!beadId || !targetStatus) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:transition <bead-id> <target-status> [current-status] [slice-id]' } });
  }

  try {
    SliceStatusSchema.parse(targetStatus);
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: `Invalid status: ${targetStatus}` } });
  }

  // Build a minimal slice object from the args
  const slice = {
    id: crypto.randomUUID(),
    milestoneId: crypto.randomUUID(),
    name: 'slice',
    sliceId: sliceId ?? 'unknown',
    status: (currentStatus ?? 'discussing') as SliceStatus,
    createdAt: new Date(),
  };

  const { store: beadStore } = await createBeadAdapter();
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
