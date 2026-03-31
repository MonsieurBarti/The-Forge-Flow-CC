import { z } from 'zod';
export const DependencyTypeSchema = z.literal('blocks');
export const DependencySchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  type: DependencyTypeSchema,
});
export type Dependency = z.infer<typeof DependencySchema>;
