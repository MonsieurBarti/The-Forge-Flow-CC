import { checkStaleClaims } from '../../application/claims/check-stale-claims.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';

export const claimCheckStaleCmd = async (args: string[]): Promise<string> => {
  const ttlMinutes = args[0] ? parseInt(args[0], 10) : 30;
  if (isNaN(ttlMinutes) || ttlMinutes <= 0) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: claim:check-stale [ttl-minutes]' },
    });
  }
  const { store: beadStore } = await createBeadAdapter();
  const result = await checkStaleClaims({ ttlMinutes }, { beadStore });
  if (isOk(result)) {
    return JSON.stringify({
      ok: true,
      data: {
        staleClaims: result.data.staleClaims.map((b) => ({
          id: b.id,
          title: b.title,
          claimedAt: b.claimedAt,
          label: b.label,
        })),
        count: result.data.staleClaims.length,
      },
    });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
