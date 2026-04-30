import { z } from "zod";
import { SliceKindSchema } from "../entities/slice.js";
import { ComplexityTierSchema } from "./complexity-tier.js";
export const SlicePropsSchema = z.object({
	milestoneId: z.string().min(1).optional(),
	kind: SliceKindSchema.optional(),
	number: z.number().int().min(1),
	title: z.string().min(1),
	tier: ComplexityTierSchema.optional(),
	baseBranch: z.string().min(1).optional(),
	branchName: z.string().min(1).optional(),
	id: z.string().optional(),
});
export type SliceProps = z.infer<typeof SlicePropsSchema>;
