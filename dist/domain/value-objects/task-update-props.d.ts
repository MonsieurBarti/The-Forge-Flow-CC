import { z } from "zod";
export declare const TaskUpdatePropsSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    wave: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type TaskUpdateProps = z.infer<typeof TaskUpdatePropsSchema>;
//# sourceMappingURL=task-update-props.d.ts.map