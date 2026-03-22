import { createDomainError } from './domain-error.js';

export const invalidTransitionError = (sliceId: string, from: string, to: string) =>
  createDomainError('INVALID_TRANSITION', `Cannot transition slice "${sliceId}" from "${from}" to "${to}"`, {
    sliceId,
    from,
    to,
  });
