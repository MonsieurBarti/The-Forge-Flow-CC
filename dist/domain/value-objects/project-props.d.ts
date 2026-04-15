import { z } from "zod";
export declare const ProjectPropsSchema: z.ZodObject<{
    name: z.ZodString;
    vision: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProjectProps = z.infer<typeof ProjectPropsSchema>;
//# sourceMappingURL=project-props.d.ts.map