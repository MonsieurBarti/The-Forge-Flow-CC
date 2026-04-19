import type {
	CalibrationCell,
	CalibrationRecommendation,
} from "../value-objects/calibration-report.js";

export interface RuleConfig {
	n_min: number;
}

export type CalibrationRule = (
	cell: CalibrationCell,
	config: RuleConfig,
) => CalibrationRecommendation[];

const TIER_DIRECTION_THRESHOLD = 0.66;

export const tierTooLowDominant: CalibrationRule = (cell, config) => {
	if (cell.effective_total < config.n_min) return [];
	const { too_low, too_high } = cell.verdict_breakdown;
	const directional = too_low + too_high;
	if (directional === 0) return [];
	if (too_low / directional < TIER_DIRECTION_THRESHOLD) return [];
	return [
		{
			rule_id: "tier-too-low-dominant",
			cell_key: cell.key,
			severity: "suggest",
			message: `cell '${cell.key.kind}:${cell.key.value}' skews tier-too-low (${too_low}/${directional}); consider raising tier floor one step in settings.yaml routing.tier_policy`,
		},
	];
};

export const tierTooHighDominant: CalibrationRule = (cell, config) => {
	if (cell.effective_total < config.n_min) return [];
	const { too_low, too_high } = cell.verdict_breakdown;
	const directional = too_low + too_high;
	if (directional === 0) return [];
	if (too_high / directional < TIER_DIRECTION_THRESHOLD) return [];
	return [
		{
			rule_id: "tier-too-high-dominant",
			cell_key: cell.key,
			severity: "suggest",
			message: `cell '${cell.key.kind}:${cell.key.value}' skews tier-too-high (${too_high}/${directional}); consider lowering tier ceiling one step in settings.yaml routing.tier_policy`,
		},
	];
};

const ALL_RULES: CalibrationRule[] = [tierTooLowDominant, tierTooHighDominant];

export const runAllRules: CalibrationRule = (cell, config) =>
	ALL_RULES.flatMap((rule) => rule(cell, config));
