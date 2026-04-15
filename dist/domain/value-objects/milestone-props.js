import { z } from "zod";
export const MilestonePropsSchema = z.object({
    number: z.number().int().min(1),
    name: z.string().min(1),
});
//# sourceMappingURL=milestone-props.js.map