import type { DomainError } from '../../domain/errors/domain-error.js';
import type { BeadData, BeadStore } from '../../domain/ports/bead-store.port.js';
import type { Result } from '../../domain/result.js';

interface ListMilestonesDeps {
  beadStore: BeadStore;
}

export const listMilestones = async (deps: ListMilestonesDeps): Promise<Result<BeadData[], DomainError>> => {
  return deps.beadStore.list({ label: 'tff:milestone' });
};
