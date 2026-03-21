import { type Result, Err, isOk } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface GetProjectDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

export const getProject = async (
  deps: GetProjectDeps,
): Promise<Result<BeadData, DomainError>> => {
  const result = await deps.beadStore.list({ label: 'tff:project' });
  if (!isOk(result)) return result;

  if (result.data.length === 0) {
    return Err(createDomainError(
      'NOT_FOUND',
      'No tff project found in this repository. Run /tff:new to create one.',
    ));
  }

  return { ok: true, data: result.data[0] };
};
