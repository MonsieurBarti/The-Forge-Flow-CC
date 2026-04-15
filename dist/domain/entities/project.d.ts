import { z } from "zod";
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    vision: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
}, z.core.$strip>;
export type Project = z.infer<typeof ProjectSchema>;
export declare const createProject: (input: {
    name: string;
    vision?: string;
}) => Project;
//# sourceMappingURL=project.d.ts.map