import { z } from "zod";
import {
	milestoneBranchName,
	milestoneLabel as milestoneLabelHelper,
} from "../helpers/branch-naming.js";
import { type MilestoneStatus, MilestoneStatusSchema } from "../value-objects/milestone-status.js";

export { type MilestoneStatus, MilestoneStatusSchema };

export const MilestoneSchema = z.object({
	id: z.string().min(1),
	projectId: z.string().min(1),
	name: z.string().min(1),
	number: z.number().int().min(1),
	status: MilestoneStatusSchema,
	branch: z.string().min(1),
	closeReason: z.string().optional(),
	createdAt: z.date(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

/**
 * Generate a random UUID v4
 */
const generateUuid = (): string => {
	return crypto.randomUUID();
};

export const createMilestone = (input: {
	projectId: string;
	name: string;
	number: number;
}): Milestone => {
	const id = generateUuid();
	const branch = milestoneBranchName(id);
	const milestone = {
		id,
		projectId: input.projectId,
		name: input.name,
		number: input.number,
		status: "open" as const,
		branch,
		createdAt: new Date(),
	};
	return MilestoneSchema.parse(milestone);
};

/**
 * Format a milestone number as a human-readable label (M##).
 * Re-exported from branch-naming helper for convenience.
 */
export const milestoneLabel = (n: number): string => {
	return milestoneLabelHelper(n);
};
