/**
 * Calibration report value objects for the Phase D feedback-loop.
 * Additive-only across Phase D+: do NOT rename or remove existing fields.
 * These are pure data shapes — no logic, no side effects.
 */
import { z } from "zod";

export const CellKeyKindSchema = z.enum(["agent", "tag"]);
export const CellKeySchema = z.object({
	kind: CellKeyKindSchema,
	value: z.string().min(1),
});
export type CellKey = z.infer<typeof CellKeySchema>;

export const VerdictBreakdownSchema = z.object({
	ok: z.number().int().nonnegative(),
	wrong: z.number().int().nonnegative(),
	too_low: z.number().int().nonnegative(),
	too_high: z.number().int().nonnegative(),
});
export type VerdictBreakdown = z.infer<typeof VerdictBreakdownSchema>;

export const CalibrationCellSchema = z.object({
	key: CellKeySchema,
	total: z.number().int().nonnegative(),
	effective_total: z.number().nonnegative(),
	effective_wrong: z.number().nonnegative(),
	verdict_breakdown: VerdictBreakdownSchema,
	sample_decision_ids: z.array(z.string().uuid()).max(10),
});
export type CalibrationCell = z.infer<typeof CalibrationCellSchema>;

export const SeveritySchema = z.enum(["info", "suggest", "strong"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const CalibrationRecommendationSchema = z.object({
	rule_id: z.string().min(1),
	cell_key: CellKeySchema,
	severity: SeveritySchema,
	message: z.string().min(1),
});
export type CalibrationRecommendation = z.infer<typeof CalibrationRecommendationSchema>;

export const SkippedCellSchema = z.object({
	key: CellKeySchema,
	total: z.number().int().nonnegative(),
	reason: z.string().min(1),
});
export type SkippedCell = z.infer<typeof SkippedCellSchema>;

export const CalibrationReportSchema = z.object({
	generated_at: z.string().datetime(),
	n_min: z.number().int().positive(),
	source_weights: z.record(z.string(), z.number().min(0).max(2)).optional(),
	decisions_scanned: z.number().int().nonnegative(),
	outcomes_scanned: z.number().int().nonnegative(),
	cells: z.array(CalibrationCellSchema),
	recommendations: z.array(CalibrationRecommendationSchema),
	skipped_cells: z.array(SkippedCellSchema),
});
export type CalibrationReport = z.infer<typeof CalibrationReportSchema>;
