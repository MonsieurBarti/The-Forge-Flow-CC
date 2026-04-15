import { z } from "zod";
export const ProjectPropsSchema = z.object({
	name: z.string().min(1),
	vision: z.string().min(1).optional(),
});
export type ProjectProps = z.infer<typeof ProjectPropsSchema>;
