import { z } from "zod";
import { DifficultySchema } from "./difficulty.js";

export const TaskPropsSchema = z.object({
	sliceId: z.string().min(1),
	number: z.number().int().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	wave: z.number().int().nonnegative().optional(),
	difficulty: DifficultySchema.optional(),
});
export type TaskProps = z.infer<typeof TaskPropsSchema>;
