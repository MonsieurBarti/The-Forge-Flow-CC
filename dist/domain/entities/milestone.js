import { z } from "zod";
import { MilestoneStatusSchema } from "../value-objects/milestone-status.js";
export { MilestoneStatusSchema };
export const MilestoneSchema = z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    name: z.string().min(1),
    number: z.number().int().min(1),
    status: MilestoneStatusSchema,
    closeReason: z.string().optional(),
    createdAt: z.date(),
});
export const createMilestone = (input) => {
    const milestone = {
        id: formatMilestoneNumber(input.number),
        projectId: input.projectId,
        name: input.name,
        number: input.number,
        status: "open",
        createdAt: new Date(),
    };
    return MilestoneSchema.parse(milestone);
};
export const formatMilestoneNumber = (n) => `M${n.toString().padStart(2, "0")}`;
//# sourceMappingURL=milestone.js.map