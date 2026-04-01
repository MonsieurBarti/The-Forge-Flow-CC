import { z } from 'zod';

export const RestoreResultSchema = z.object({
  filesRestored: z.number().int().nonnegative(),
  schemaVersion: z.number().int().nonnegative(),
});

export type RestoreResult = z.infer<typeof RestoreResultSchema>;
