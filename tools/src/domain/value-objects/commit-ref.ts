import { z } from 'zod';

export const CommitRefSchema = z.object({
  sha: z.string().min(7).max(40).regex(/^[a-f0-9]+$/),
  message: z.string().min(1),
});

export type CommitRef = z.infer<typeof CommitRefSchema>;
