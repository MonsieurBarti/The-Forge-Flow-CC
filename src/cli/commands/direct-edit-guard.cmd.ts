import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { detectDirectEdit } from '../../application/guard/detect-direct-edit.js';
import { withBranchGuard } from '../with-branch-guard.js';

/**
 * Check if direct-edit guards are disabled in settings.yaml.
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

export const directEditGuardCmd = async (_args: string[]): Promise<string> => {
  // Fast path: check if guards are disabled
  if (areGuardsDisabled()) {
    return JSON.stringify({
      ok: true,
      data: { warning: null },
    });
  }

  // Check if project is initialized
  if (!isProjectInitialized()) {
    return JSON.stringify({
      ok: true,
      data: { warning: null },
    });
  }

  const result = await withBranchGuard(async (stores) => {
    try {
      const detectResult = detectDirectEdit({
        sessionStore: stores.sessionStore,
        taskStore: stores.taskStore,
      });

      // Return warning message if present, otherwise null
      const warning = detectResult.warning?.message ?? null;

      return JSON.stringify({
        ok: true,
        data: { warning },
      });
    } catch (err) {
      return JSON.stringify({
        ok: false,
        error: {
          code: 'GUARD_CHECK_FAILED',
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  });

  // withBranchGuard can return a string directly (for BRANCH_MISMATCH errors)
  // or the result of the callback. If it's already a string, return it.
  if (typeof result === 'string') {
    return result;
  }

  // This should not happen as the callback always returns a string,
  // but handle it defensively
  return result;
};
