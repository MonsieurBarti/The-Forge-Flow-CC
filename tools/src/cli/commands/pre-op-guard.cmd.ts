import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  validateOperation,
  OperationBlockedError,
} from '../../application/guard/validate-operation.js';
import { isValidOperation } from '../../application/index.js';
import { withSyncLock } from '../with-sync-lock.js';
import { withBranchGuard } from '../with-branch-guard.js';
import { isOk } from '../../domain/result.js';

/**
 * Check if pre-operation guards are disabled in settings.yaml.
 * Returns true if workflow.guards is explicitly false.
 */
function areGuardsDisabled(): boolean {
  const settingsPath = path.join(process.cwd(), '.tff', 'settings.yaml');
  if (!existsSync(settingsPath)) {
    return false; // Default to enabled if no settings file
  }
  try {
    const content = readFileSync(settingsPath, 'utf8');
    if (!content.trim()) return false;
    const parsed = parseYaml(content) as Record<string, unknown>;
    return (parsed?.workflow as Record<string, unknown> | undefined)?.guards === false;
  } catch {
    return false; // On any error, default to enabled
  }
}

/**
 * Check if the project is initialized (has .tff directory).
 */
function isProjectInitialized(): boolean {
  const tffDir = path.join(process.cwd(), '.tff');
  return existsSync(tffDir);
}

export const preOpGuardCmd = async (args: string[]): Promise<string> => {
  // Parse args: expect (sliceId, operation)
  const sliceId = args[0];
  const operation = args[1];

  if (!sliceId || !operation) {
    return JSON.stringify({
      ok: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'Usage: pre-op-guard <sliceId> <operation>',
      },
    });
  }

  // Fast path: check if guards are disabled
  if (areGuardsDisabled()) {
    return JSON.stringify({
      ok: true,
      data: { blocked: false },
    });
  }

  // Check if project is initialized
  if (!isProjectInitialized()) {
    return JSON.stringify({
      ok: true,
      data: { blocked: false },
    });
  }

  // Validate operation name early for clear error
  if (!isValidOperation(operation)) {
    return JSON.stringify({
      ok: false,
      error: {
        code: 'INVALID_OPERATION',
        message: `Unknown operation: ${operation}`,
        recoveryHint: `Supported operations: discuss, research, plan, execute, verify, ship, complete`,
      },
    });
  }

  // Compose withSyncLock (outer) + withBranchGuard (inner) per knowledge.md
  const result = await withSyncLock(async (stores) => {
    return withBranchGuard(async ({ sliceStore }) => {
      try {
        // Retrieve the slice
        const sliceResult = sliceStore.getSlice(sliceId);
        if (!isOk(sliceResult)) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'SLICE_NOT_FOUND',
              message: `Failed to retrieve slice: ${sliceResult.error.message}`,
              recoveryHint: `Check that slice ${sliceId} exists.`,
            },
          });
        }

        const slice = sliceResult.data;
        if (!slice) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'SLICE_NOT_FOUND',
              message: `Slice ${sliceId} not found`,
              recoveryHint: `Check that slice ${sliceId} exists.`,
            },
          });
        }

        // Validate operation against current slice status
        const validationResult = validateOperation(operation, slice.status);

        if (!validationResult.allowed) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'PREREQUISITE_NOT_MET',
              message: validationResult.message,
              recoveryHint: validationResult.recoveryHint,
            },
          });
        }

        // Operation is allowed
        return JSON.stringify({
          ok: true,
          data: { blocked: false },
        });
      } catch (err) {
        if (err instanceof OperationBlockedError) {
          return JSON.stringify({
            ok: false,
            error: {
              code: 'PREREQUISITE_NOT_MET',
              message: err.message,
              recoveryHint: err.recoveryHint,
            },
          });
        }
        return JSON.stringify({
          ok: false,
          error: {
            code: 'GUARD_CHECK_FAILED',
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    });
  });

  // withSyncLock can return SyncLockResult (when lock is held)
  if (result && typeof result === 'object' && 'ok' in result && result.ok === true) {
    if ('data' in result && result.data && typeof result.data === 'object') {
      if ('action' in result.data && result.data.action === 'skipped') {
        return JSON.stringify({
          ok: false,
          error: {
            code: 'LOCK_UNAVAILABLE',
            message: 'Sync lock held by another process',
            recoveryHint: 'Wait for other operations to complete and retry.',
          },
        });
      }
    }
  }

  // withBranchGuard returns string directly for BRANCH_MISMATCH errors
  if (typeof result === 'string') {
    return result;
  }

  // This should not happen - the callback always returns a string
  // but handle defensively
  return (result as unknown) as string;
};
