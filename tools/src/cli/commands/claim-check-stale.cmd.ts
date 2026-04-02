import { checkStaleClaims } from '../../application/claims/check-stale-claims.js';
import { isOk } from '../../domain/result.js';
import { withBranchGuard } from '../with-branch-guard.js';

export const claimCheckStaleCmd = async (args: string[]): Promise<string> => {
  const ttlMinutes = args[0] ? parseInt(args[0], 10) : 30;
  if (Number.isNaN(ttlMinutes) || ttlMinutes <= 0) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: claim:check-stale [ttl-minutes]' },
    });
  }
  return withBranchGuard(async ({ taskStore }) => {
    const result = await checkStaleClaims({ ttlMinutes }, { taskStore });
    if (isOk(result)) {
      return JSON.stringify({
        ok: true,
        data: {
          staleClaims: result.data.staleClaims.map((t) => ({
            id: t.id,
            title: t.title,
            claimedAt: t.claimedAt,
          })),
          count: result.data.staleClaims.length,
        },
      });
    }
    return JSON.stringify({ ok: false, error: result.error });
  });
};
