import type { Task } from '../../domain/entities/task.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import { Ok, type Result } from '../../domain/result.js';
import type { TaskStore } from '../../domain/ports/task-store.port.js';

interface CheckStaleClaimsInput {
  ttlMinutes?: number;
}
interface CheckStaleClaimsDeps {
  taskStore: TaskStore;
}
interface CheckStaleClaimsOutput {
  staleClaims: Task[];
}

const DEFAULT_TTL_MINUTES = 30;

export const checkStaleClaims = async (
  input: CheckStaleClaimsInput,
  deps: CheckStaleClaimsDeps,
): Promise<Result<CheckStaleClaimsOutput, DomainError>> => {
  const ttl = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const result = deps.taskStore.listStaleClaims(ttl);
  if (!result.ok) return result;
  return Ok({ staleClaims: result.data });
};
