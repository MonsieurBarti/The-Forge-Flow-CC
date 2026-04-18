import { z } from "zod";

export const AgentCapabilitySchema = z.object({
	id: z.string().min(1),
	handles: z.array(z.string()),
	priority: z.number().int(),
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
