import { transitionSliceUseCase } from '../../application/lifecycle/transition-slice.js';
import { isOk } from '../../domain/result.js';
import { type SliceStatus, SliceStatusSchema } from '../../domain/value-objects/slice-status.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { tffWarn } from '../../infrastructure/adapters/logging/warn.js';

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
  const [beadId, targetStatus] = args;
  if (!beadId || !targetStatus) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: slice:transition <bead-id> <target-status>' },
    });
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

  // Validate bead status is a valid slice status
  const parsedStatus = SliceStatusSchema.safeParse(bead.status);
  if (!parsedStatus.success) {
    return JSON.stringify({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: `Bead has invalid slice status: "${bead.status}"` },
    });
  }

  if (!bead.parentId) {
    return JSON.stringify({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: `Bead "${beadId}" has no parent milestone` },
    });
  }

  // Extract slice ID from bead design field (format: "Slice M01-S01: ...")
  const sliceIdMatch = bead.design?.match(/Slice (M\d+-S\d+)/);
  const sliceId = sliceIdMatch?.[1] ?? 'unknown';

  // Extract number from sliceId (e.g., "M01-S03" → 3)
  const sliceNumberMatch = sliceId.match(/S(\d+)/);
  const sliceNumber = sliceNumberMatch ? parseInt(sliceNumberMatch[1], 10) : 1;

  const slice = {
    id: sliceId,
    milestoneId: bead.parentId,
    number: sliceNumber,
    title: bead.title,
    status: parsedStatus.data,
    createdAt: new Date(),
  };

  const result = await transitionSliceUseCase(
    { slice, beadId, targetStatus: targetStatus as SliceStatus },
    { beadStore },
  );

  if (isOk(result)) {
    const warnings: string[] = [];

    // Auto-snapshot (non-critical)
    try {
      const { snapshotSaveCmd } = await import('./snapshot-save.cmd.js');
      await snapshotSaveCmd([]);
    } catch (e) {
      const msg = `snapshot failed: ${String(e)}`;
      tffWarn(msg);
      warnings.push(msg);
    }

    // Auto-sync to Dolt (non-critical)
    try {
      const { readFile } = await import('node:fs/promises');
      const { loadProjectSettings } = await import('../../domain/value-objects/project-settings.js');
      const { doltPush } = await import('../../infrastructure/adapters/dolt/dolt-sync.js');
      const raw = await readFile('.tff/settings.yaml', 'utf-8');
      const settings = loadProjectSettings(raw);
      if (settings.dolt?.['auto-sync'] && settings.dolt.remote) {
        await doltPush(settings.dolt.remote);
      }
    } catch (e) {
      const msg = `dolt sync failed: ${String(e)}`;
      tffWarn(msg);
      warnings.push(msg);
    }

    // Auto-regenerate STATE.md (non-critical)
    try {
      const { syncStateCmd } = await import('./sync-state.cmd.js');
      await syncStateCmd([bead.parentId ?? '']);
    } catch (e) {
      const msg = `state sync failed: ${String(e)}`;
      tffWarn(msg);
      warnings.push(msg);
    }

    // Auto-save CHECKPOINT.md (CRITICAL — blocks transition)
    try {
      const { checkpointSaveCmd } = await import('./checkpoint-save.cmd.js');
      const checkpointData = JSON.stringify({
        sliceId,
        baseCommit: '',
        currentWave: 0,
        completedWaves: [],
        completedTasks: [],
        executorLog: [],
      });
      await checkpointSaveCmd([checkpointData]);
    } catch (e) {
      return JSON.stringify({
        ok: false,
        error: { code: 'CHECKPOINT_FAILED', message: `Checkpoint save failed: ${String(e)}` },
        warnings,
      });
    }

    return JSON.stringify({ ok: true, data: { status: result.data.slice.status }, warnings });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
