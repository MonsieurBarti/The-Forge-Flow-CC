import { createDomainError } from './domain-error.js';

export const syncConflictError = (
  entityId: string,
  field: string,
  mdValue: string,
  beadValue: string,
) =>
  createDomainError(
    'SYNC_CONFLICT',
    `Sync conflict on "${entityId}" field "${field}": markdown="${mdValue}", bead="${beadValue}"`,
    { entityId, field, mdValue, beadValue },
  );
