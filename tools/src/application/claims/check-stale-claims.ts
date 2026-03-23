import type { DomainError } from '../../domain/errors/domain-error.js';
import type { BeadData, BeadStore } from '../../domain/ports/bead-store.port.js';
import { Ok, type Result } from '../../domain/result.js';

interface CheckStaleClaimsInput {
  ttlMinutes?: number;
}
interface CheckStaleClaimsDeps {
  beadStore: BeadStore;
}
interface CheckStaleClaimsOutput {
  staleClaims: BeadData[];
}

const DEFAULT_TTL_MINUTES = 30;

export const checkStaleClaims = async (
  input: CheckStaleClaimsInput,
  deps: CheckStaleClaimsDeps,
): Promise<Result<CheckStaleClaimsOutput, DomainError>> => {
  const ttl = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const result = await deps.beadStore.listStaleClaims(ttl);
  if (!result.ok) return result;
  return Ok({ staleClaims: result.data });
};
