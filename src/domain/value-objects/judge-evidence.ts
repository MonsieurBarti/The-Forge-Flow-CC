import { z } from "zod";
import { SignalsSchema } from "./signals.js";
import { ModelTierSchema } from "./tier-decision.js";

export const JudgeEvidenceDecisionSchema = z.object({
	decision_id: z.string().uuid(),
	agent: z.string().min(1),
	tier: ModelTierSchema,
	signals: SignalsSchema,
	fallback_used: z.boolean(),
	confidence: z.number().min(0).max(1),
});

export type JudgeEvidenceDecision = z.infer<typeof JudgeEvidenceDecisionSchema>;

export const JudgeEvidenceSchema = z.object({
	slice_id: z.string().min(1),
	slice_label: z.string().regex(/^M\d+-S\d+$/),
	slice_spec: z.string(),
	merge_commit: z.string().regex(/^[0-9a-f]{7,40}$/),
	diff_summary: z.object({
		files_changed: z.number().int().min(0),
		insertions: z.number().int().min(0),
		deletions: z.number().int().min(0),
		patch: z.string(),
	}),
	debug_happened: z.boolean(),
	decisions: z.array(JudgeEvidenceDecisionSchema).min(1),
});

export type JudgeEvidence = z.infer<typeof JudgeEvidenceSchema>;
