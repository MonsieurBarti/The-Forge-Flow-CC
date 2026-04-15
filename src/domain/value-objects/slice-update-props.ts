import { z } from "zod";
import { ComplexityTierSchema } from "./complexity-tier.js";
export const SliceUpdatePropsSchema = z.object({
	title: z.string().min(1).optional(),
	tier: ComplexityTierSchema.optional(),
});
export type SliceUpdateProps = z.infer<typeof SliceUpdatePropsSchema>;
