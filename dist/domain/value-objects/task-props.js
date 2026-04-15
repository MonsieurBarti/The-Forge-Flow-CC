import { z } from "zod";
export const TaskPropsSchema = z.object({
    sliceId: z.string().min(1),
    number: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    wave: z.number().int().nonnegative().optional(),
});
//# sourceMappingURL=task-props.js.map