import { createDomainError, type DomainError } from './domain-error.js';

export const versionMismatchError = (dbVersion: number, codeVersion: number): DomainError =>
  createDomainError(
    'VERSION_MISMATCH',
    `Database schema version ${dbVersion} is newer than code version ${codeVersion}. Upgrade tff-tools.`,
    { dbVersion, codeVersion },
  );
