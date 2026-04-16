import type { ComplexityTier } from "../../domain/value-objects/complexity-tier.js";
import type { Difficulty, ModelProfile } from "../../domain/value-objects/difficulty.js";
import {
	DIFFICULTY_THRESHOLDS,
	DIFFICULTY_WEIGHTS,
} from "../../domain/value-objects/difficulty.js";

export interface DifficultySignals {
	fileCount: number;
	filesTouched: number;
	keywords: string[];
	hasDeps: boolean;
	isDep: boolean;
	waveDepth: number;
	maxWave: number;
	sliceTier: ComplexityTier;
}

const SEMANTIC_KEYWORDS: Record<string, number> = {
	refactor: 2.0,
	implement: 1.5,
	add: 1.0,
	update: 0.8,
	fix: 0.5,
	tweak: 0.3,
};

export function computeFileScopeScore(fileCount: number, filesTouched: number): number {
	return Math.log10(Math.max(1, fileCount)) + filesTouched / 10;
}

export function computeSemanticScore(keywords: string[]): number {
	if (keywords.length === 0) return 0;
	const scores = keywords.map((kw) => SEMANTIC_KEYWORDS[kw.toLowerCase()] ?? 0.5);
	return Math.max(...scores);
}

export function computeDependencyScore(
	hasDeps: boolean,
	isDep: boolean,
	waveDepth: number,
	maxWave: number,
): number {
	const depContribution = hasDeps ? 1 : 0;
	const isDepContribution = isDep ? 0.5 : 0;
	const waveContribution = maxWave > 0 ? waveDepth / maxWave : 0;
	return depContribution + isDepContribution + waveContribution;
}

export function computeTierScore(tier: ComplexityTier): number {
	switch (tier) {
		case "S":
			return 0;
		case "F-lite":
			return 0.5;
		case "F-full":
			return 1;
	}
}

export function classifyDifficulty(signals: DifficultySignals): Difficulty {
	const { fileCount, filesTouched, keywords, hasDeps, isDep, waveDepth, maxWave, sliceTier } =
		signals;

	const fileScopeScore =
		computeFileScopeScore(fileCount, filesTouched) * DIFFICULTY_WEIGHTS.fileScope;
	const semanticScore = computeSemanticScore(keywords) * DIFFICULTY_WEIGHTS.semanticHints;
	const dependencyScore =
		computeDependencyScore(hasDeps, isDep, waveDepth, maxWave) * DIFFICULTY_WEIGHTS.dependencyRole;
	const tierScore = computeTierScore(sliceTier) * DIFFICULTY_WEIGHTS.sliceTier;

	const totalScore = fileScopeScore + semanticScore + dependencyScore + tierScore;

	if (totalScore < DIFFICULTY_THRESHOLDS.low.max) return "low";
	if (totalScore < DIFFICULTY_THRESHOLDS.high.min) return "medium";
	return "high";
}

export function difficultyToProfile(difficulty: Difficulty): ModelProfile {
	switch (difficulty) {
		case "low":
			return "budget";
		case "medium":
			return "balanced";
		case "high":
			return "quality";
	}
}

export function resolveModelFromProfile(
	profile: ModelProfile,
	settings: {
		"model-profiles": {
			quality?: { model: string };
			balanced?: { model: string };
			budget?: { model: string };
		};
	},
): string | undefined {
	const profiles = settings["model-profiles"];
	switch (profile) {
		case "quality":
			return profiles.quality?.model;
		case "balanced":
			return profiles.balanced?.model;
		case "budget":
			return profiles.budget?.model;
	}
}
