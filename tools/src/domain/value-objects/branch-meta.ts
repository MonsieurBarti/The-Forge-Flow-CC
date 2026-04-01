import { z } from 'zod';

export const BranchMetaSchema = z.object({
  stateId: z.string().uuid(),
  codeBranch: z.string().min(1),
  parentStateBranch: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
});

export type BranchMeta = z.infer<typeof BranchMetaSchema>;
