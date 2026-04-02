import { isOk } from '../../domain/result.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const sliceCloseCmd = async (args: string[]): Promise<string> => {
  const [sliceId, ...rest] = args;
  if (!sliceId)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: slice:close <slice-id> [--reason "..."]' },
    });

  let reason: string | undefined;
  const reasonIdx = rest.indexOf('--reason');
  if (reasonIdx !== -1 && rest[reasonIdx + 1]) {
    reason = rest.slice(reasonIdx + 1).join(' ');
  }

  return withBranchGuard(async ({ sliceStore }) => {
    // Transition to closed via the normal transition path
    const result = sliceStore.transitionSlice(sliceId, 'closed');
    if (isOk(result)) return JSON.stringify({ ok: true, data: { status: 'closed', reason } });
    return JSON.stringify({ ok: false, error: result.error });
  });
};
