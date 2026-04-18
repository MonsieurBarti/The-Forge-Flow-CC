import { z } from "zod";

export const ComplexityLevelSchema = z.enum(["low", "medium", "high"]);
export type ComplexityLevel = z.infer<typeof ComplexityLevelSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskSchema = z.object({
	level: RiskLevelSchema,
	tags: z.array(z.string()),
});
export type Risk = z.infer<typeof RiskSchema>;

/**
 * Signals is an additive-only contract across Phase A/B/C.
 * Phase B may add `tier_hint`; Phase C may add further fields.
 * DO NOT rename or remove existing fields.
 */
export const SignalsSchema = z.object({
	complexity: ComplexityLevelSchema,
	risk: RiskSchema,
});
export type Signals = z.infer<typeof SignalsSchema>;
