import { createDomainError } from './domain-error.js';

export const stateBranchNotFoundError = (codeBranch: string) =>
  createDomainError('STATE_BRANCH_NOT_FOUND', `No state branch found for code branch "${codeBranch}"`, { codeBranch });
