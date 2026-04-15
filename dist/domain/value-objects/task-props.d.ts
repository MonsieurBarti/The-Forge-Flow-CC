import { z } from "zod";
export declare const TaskPropsSchema: z.ZodObject<{
    sliceId: z.ZodString;
    number: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    wave: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type TaskProps = z.infer<typeof TaskPropsSchema>;
//# sourceMappingURL=task-props.d.ts.map