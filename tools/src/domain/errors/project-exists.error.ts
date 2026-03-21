import { createDomainError } from './domain-error.js';

export const projectExistsError = (projectName: string) =>
  createDomainError(
    'PROJECT_EXISTS',
    `Project "${projectName}" already exists in this repository`,
    { projectName },
  );
