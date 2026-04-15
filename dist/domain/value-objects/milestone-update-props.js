import { z } from "zod";
import { MilestoneStatusSchema } from "./milestone-status.js";
export const MilestoneUpdatePropsSchema = z.object({
    name: z.string().min(1).optional(),
    status: MilestoneStatusSchema.optional(),
});
//# sourceMappingURL=milestone-update-props.js.map