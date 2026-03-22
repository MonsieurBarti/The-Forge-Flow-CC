import { createDomainEvent } from './domain-event.js';

export const syncConflictEvent = (entityId: string, field: string, winner: 'markdown' | 'beads') =>
  createDomainEvent('SYNC_CONFLICT', { entityId, field, winner });
