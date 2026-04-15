import { isOk } from '../../domain/result.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const depAddCmd = async (args: string[]): Promise<string> => {
  const [fromId, toId] = args;
  if (!fromId || !toId)
    return JSON.stringify({
      ok: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'Usage: dep:add <from-id> <to-id> — means <from-id> is blocked by <to-id>',
      },
    });

  return withBranchGuard(async ({ dependencyStore }) => {
    const result = dependencyStore.addDependency(fromId, toId, 'blocks');
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
