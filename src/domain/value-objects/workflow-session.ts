import { z } from "zod";
export const WorkflowSessionSchema = z.object({
	phase: z.string().min(1),
	activeSliceId: z.string().optional(),
	activeMilestoneId: z.string().optional(),
	pausedAt: z.string().optional(),
	contextJson: z.string().optional(),
});
export type WorkflowSession = z.infer<typeof WorkflowSessionSchema>;
