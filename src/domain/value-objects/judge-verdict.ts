import { z } from "zod";
import { isValidDimensionVerdict } from "../helpers/dimension-verdict.js";

export const JudgeDimensionSchema = z.enum(["agent", "tier"]);
export type JudgeDimension = z.infer<typeof JudgeDimensionSchema>;

export const JudgeVerdictValueSchema = z.enum(["ok", "wrong", "too-low", "too-high"]);
export type JudgeVerdictValue = z.infer<typeof JudgeVerdictValueSchema>;

const BaseShape = z.object({
	decision_id: z.string().uuid(),
	dimension: JudgeDimensionSchema,
	verdict: JudgeVerdictValueSchema,
	reason: z.string().max(500),
});

/**
 * JudgeVerdict is what the model-judge emits per routing decision. The
 * dimension×verdict refinement mirrors RoutingOutcomeSchema but `unknown`
 * is not allowed — that dimension is reserved for DebugJoinOutcomeSource.
 */
export const JudgeVerdictSchema = BaseShape.superRefine((v, ctx) => {
	// Defense-in-depth: JudgeDimensionSchema already rejects "unknown", but we also
	// apply the shared predicate so the error message is consistent.
	if (!isValidDimensionVerdict(v.dimension, v.verdict)) {
		ctx.addIssue({
			code: "custom",
			message: `verdict "${v.verdict}" not allowed for dimension "${v.dimension}"`,
			path: ["verdict"],
		});
	}
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
