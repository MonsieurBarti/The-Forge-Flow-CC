import { z } from "zod";
export const ProjectSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    vision: z.string().min(1).optional(),
    createdAt: z.date(),
});
export const createProject = (input) => {
    const project = {
        id: crypto.randomUUID(),
        name: input.name,
        vision: input.vision,
        createdAt: new Date(),
    };
    return ProjectSchema.parse(project);
};
//# sourceMappingURL=project.js.map