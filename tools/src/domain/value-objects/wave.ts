import { z } from 'zod';

export const WaveSchema = z.object({
  index: z.number().int().nonnegative(),
  taskIds: z.array(z.string()).min(1),
});

export type Wave = z.infer<typeof WaveSchema>;
