import { z } from "zod";

export const ObservationSchema = z.object({
	ts: z.string(),
	session: z.string(),
	tool: z.string().min(1),
	args: z.string().nullable(),
	project: z.string(),
});

export type Observation = z.infer<typeof ObservationSchema>;
