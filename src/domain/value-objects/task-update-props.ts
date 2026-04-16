import { z } from "zod";
import { DifficultySchema } from "./difficulty.js";

export const TaskUpdatePropsSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	wave: z.number().int().nonnegative().optional(),
	difficulty: DifficultySchema.optional(),
});
export type TaskUpdateProps = z.infer<typeof TaskUpdatePropsSchema>;
