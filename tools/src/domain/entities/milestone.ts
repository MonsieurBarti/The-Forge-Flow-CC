import { z } from 'zod';
import { MilestoneStatusSchema, type MilestoneStatus } from '../value-objects/milestone-status.js';

export { MilestoneStatusSchema, type MilestoneStatus };

export const MilestoneSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  number: z.number().int().min(1),
  status: MilestoneStatusSchema,
  createdAt: z.date(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

export const createMilestone = (input: { projectId: string; name: string; number: number }): Milestone => {
  const milestone = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: input.name,
    number: input.number,
    status: 'open' as const,
    createdAt: new Date(),
  };
  return MilestoneSchema.parse(milestone);
};

export const formatMilestoneNumber = (n: number): string => `M${n.toString().padStart(2, '0')}`;
