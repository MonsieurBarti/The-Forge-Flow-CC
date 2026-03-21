import { z } from 'zod';

export const BeadLabelSchema = z.enum([
  'tff:project',
  'tff:milestone',
  'tff:slice',
  'tff:req',
  'tff:task',
  'tff:research',
]);

export type BeadLabel = z.infer<typeof BeadLabelSchema>;
