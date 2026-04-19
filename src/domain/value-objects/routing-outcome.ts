import { z } from "zod";

export const OutcomeDimensionSchema = z.enum(["agent", "tier", "unknown"]);
export type OutcomeDimension = z.infer<typeof OutcomeDimensionSchema>;

export const OutcomeVerdictSchema = z.enum(["ok", "wrong", "too-low", "too-high"]);
export type OutcomeVerdict = z.infer<typeof OutcomeVerdictSchema>;

export const OutcomeSourceKindSchema = z.enum(["debug-join", "manual"]);
export type OutcomeSourceKind = z.infer<typeof OutcomeSourceKindSchema>;

const BaseShape = z.object({
	outcome_id: z.string().uuid(),
	decision_id: z.string().uuid(),
	dimension: OutcomeDimensionSchema,
	verdict: OutcomeVerdictSchema,
	source: OutcomeSourceKindSchema,
	slice_id: z.string().min(1),
	workflow_id: z.string().min(1),
	reason: z.string().max(500).optional(),
	emitted_at: z.string().datetime(),
});

export const RoutingOutcomeSchema = BaseShape.refine(
	(o) => {
		if (o.dimension === "agent") return o.verdict === "ok" || o.verdict === "wrong";
		if (o.dimension === "unknown") return o.verdict === "wrong";
		return true;
	},
	{ message: "dimension × verdict combination not allowed" },
);

export type RoutingOutcome = z.infer<typeof RoutingOutcomeSchema>;
