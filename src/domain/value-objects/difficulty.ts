import { z } from "zod";

export const DifficultySchema = z.enum(["low", "medium", "high"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ModelProfileSchema = z.enum(["budget", "balanced", "quality"]);
export type ModelProfile = z.infer<typeof ModelProfileSchema>;

export const DIFFICULTY_THRESHOLDS = {
	low: { max: 0.4 },
	medium: { min: 0.4, max: 0.7 },
	high: { min: 0.7 },
} as const;

export const DIFFICULTY_WEIGHTS = {
	fileScope: 0.35,
	semanticHints: 0.25,
	dependencyRole: 0.2,
	sliceTier: 0.2,
} as const;
