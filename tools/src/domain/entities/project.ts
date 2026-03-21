import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  vision: z.string().min(1),
  createdAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const createProject = (input: { name: string; vision: string }): Project => {
  const project = {
    id: crypto.randomUUID(),
    name: input.name,
    vision: input.vision,
    createdAt: new Date(),
  };
  return ProjectSchema.parse(project);
};
