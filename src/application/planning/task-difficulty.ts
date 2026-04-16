import type { ComplexityTier } from "../../domain/value-objects/complexity-tier.js";
import type { Difficulty } from "../../domain/value-objects/difficulty.js";
import {
	classifyDifficulty,
	type DifficultySignals,
} from "../classification/difficulty-classifier.js";

export interface TaskDifficultyInput {
	title: string;
	description?: string;
	files: string[];
	keywords: string[];
	hasDeps: boolean;
	isDep: boolean;
	waveDepth: number;
	maxWave: number;
	sliceTier: ComplexityTier;
	manualOverride: Difficulty | null;
}

/**
 * Parse a task block from PLAN.md to extract manual difficulty override.
 * Looks for pattern: **Difficulty:** low|medium|high
 */
export function parseDifficultyOverride(taskBlock: string): Difficulty | null {
	// Match **Difficulty:** followed by optional spaces and the value
	// The pattern is: **Difficulty:** value (markdown bold with colon)
	const match = taskBlock.match(/\*\*Difficulty:\*\*\s*(low|medium|high)/i);
	if (match) {
		return match[1].toLowerCase() as Difficulty;
	}
	return null;
}

/**
 * Extract keywords from task title using semantic hints.
 * Matches words like "refactor", "implement", "fix", etc.
 */
function extractKeywordsFromTitle(title: string): string[] {
	const semanticKeywords = ["refactor", "implement", "add", "update", "fix", "tweak"];
	const lowerTitle = title.toLowerCase();
	return semanticKeywords.filter((kw) => lowerTitle.includes(kw));
}

/**
 * Compute difficulty for a task.
 * Uses manual override if provided, otherwise computes from signals.
 */
export function computeTaskDifficulty(input: TaskDifficultyInput): Difficulty {
	// If manual override is provided, use it
	if (input.manualOverride) {
		return input.manualOverride;
	}

	// Extract keywords from title if not explicitly provided
	const keywords =
		input.keywords.length > 0 ? input.keywords : extractKeywordsFromTitle(input.title);

	const signals: DifficultySignals = {
		fileCount: input.files.length,
		filesTouched: input.files.length,
		keywords,
		hasDeps: input.hasDeps,
		isDep: input.isDep,
		waveDepth: input.waveDepth,
		maxWave: input.maxWave,
		sliceTier: input.sliceTier,
	};

	return classifyDifficulty(signals);
}
