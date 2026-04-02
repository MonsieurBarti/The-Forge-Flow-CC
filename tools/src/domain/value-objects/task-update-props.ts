import { z } from 'zod';
export const TaskUpdatePropsSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  wave: z.number().int().nonnegative().optional(),
});
export type TaskUpdateProps = z.infer<typeof TaskUpdatePropsSchema>;
