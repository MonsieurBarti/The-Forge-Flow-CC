import { z } from "zod";
import { SignalsSchema } from "./signals.js";

export const RoutingDecisionSchema = z.object({
	agent: z.string().min(1),
	confidence: z.number().min(0).max(1),
	signals: SignalsSchema,
	fallback_used: z.boolean(),
	enriched: z.boolean(),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
