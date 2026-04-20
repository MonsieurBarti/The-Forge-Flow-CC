import { z } from "zod";

export const OutcomeDimensionSchema = z.enum(["agent", "tier", "unknown"]);
export type OutcomeDimension = z.infer<typeof OutcomeDimensionSchema>;

export const OutcomeVerdictSchema = z.enum(["ok", "wrong", "too-low", "too-high"]);
export type OutcomeVerdict = z.infer<typeof OutcomeVerdictSchema>;

export const OutcomeSourceKindSchema = z.enum(["debug-join", "manual", "model-judge"]);
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

/**
 * RoutingOutcome is the Phase D feedback-loop record written to
 * routing-outcomes.jsonl. Additive-only across Phase D+: do NOT rename
 * or remove fields. Dimension×verdict constraints enforced via refine.
 */
export const RoutingOutcomeSchema = BaseShape.superRefine((o, ctx) => {
	const valid =
		(o.dimension === "agent" && (o.verdict === "ok" || o.verdict === "wrong")) ||
		(o.dimension === "unknown" && o.verdict === "wrong") ||
		o.dimension === "tier";
	if (!valid) {
		ctx.addIssue({
			code: "custom",
			message: `verdict "${o.verdict}" not allowed for dimension "${o.dimension}"`,
			path: ["verdict"],
		});
	}
});

export type RoutingOutcome = z.infer<typeof RoutingOutcomeSchema>;
