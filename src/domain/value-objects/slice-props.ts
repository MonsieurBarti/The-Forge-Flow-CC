import { z } from "zod";
import { ComplexityTierSchema } from "./complexity-tier.js";
export const SlicePropsSchema = z.object({
	milestoneId: z.string().min(1),
	number: z.number().int().min(1),
	title: z.string().min(1),
	tier: ComplexityTierSchema.optional(),
});
export type SliceProps = z.infer<typeof SlicePropsSchema>;
