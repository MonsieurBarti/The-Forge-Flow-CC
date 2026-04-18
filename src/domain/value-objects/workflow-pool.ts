import { z } from "zod";
import { AgentCapabilitySchema } from "./agent-capability.js";

export const WorkflowPoolSchema = z
	.object({
		workflow_id: z.string().min(1),
		agents: z.array(AgentCapabilitySchema).min(1),
		default_agent: z.string().min(1),
	})
	.refine((pool) => pool.agents.some((a) => a.id === pool.default_agent), {
		message: "default_agent must be the id of an agent in the pool",
		path: ["default_agent"],
	});
export type WorkflowPool = z.infer<typeof WorkflowPoolSchema>;
