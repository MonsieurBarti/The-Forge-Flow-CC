import { createDomainError, type DomainError } from './domain-error.js';

export const hasOpenChildrenError = (parentId: string, openCount: number): DomainError =>
  createDomainError('HAS_OPEN_CHILDREN', `Cannot close "${parentId}" — ${openCount} children are still open`, { parentId, openCount });
