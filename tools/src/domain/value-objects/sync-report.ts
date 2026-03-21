import { z } from 'zod';

export const SyncCreatedSchema = z.object({
  entityId: z.string(),
  source: z.enum(['markdown', 'beads']),
});

export const SyncUpdatedSchema = z.object({
  entityId: z.string(),
  field: z.string(),
  source: z.enum(['markdown', 'beads']),
});

export const SyncConflictSchema = z.object({
  entityId: z.string(),
  field: z.string(),
  winner: z.enum(['markdown', 'beads']),
  mdValue: z.string(),
  beadValue: z.string(),
});

export const SyncOrphanSchema = z.object({
  entityId: z.string(),
  location: z.enum(['markdown', 'beads']),
});

export const SyncReportSchema = z.object({
  created: z.array(SyncCreatedSchema),
  updated: z.array(SyncUpdatedSchema),
  conflicts: z.array(SyncConflictSchema),
  orphans: z.array(SyncOrphanSchema),
});

export type SyncReport = z.infer<typeof SyncReportSchema>;

export const emptySyncReport = (): SyncReport => ({
  created: [],
  updated: [],
  conflicts: [],
  orphans: [],
});
