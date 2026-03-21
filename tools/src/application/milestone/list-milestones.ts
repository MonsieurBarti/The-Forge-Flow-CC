import { type Result } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';

interface ListMilestonesDeps {
  beadStore: BeadStore;
}

export const listMilestones = async (
  deps: ListMilestonesDeps,
): Promise<Result<BeadData[], DomainError>> => {
  return deps.beadStore.list({ label: 'tff:milestone' });
};
