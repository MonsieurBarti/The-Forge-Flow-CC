import { z } from "zod";
export const MilestonePropsSchema = z.object({
	number: z.number().int().min(1),
	name: z.string().min(1),
	id: z.string().optional(),
	branch: z.string().optional(),
});
export type MilestoneProps = z.infer<typeof MilestonePropsSchema>;
