import { groupOutcomes } from "../../domain/helpers/calibration-group.js";
import { runAllRules } from "../../domain/helpers/calibration-rules.js";
import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";
import type {
	CalibrationCell,
	CalibrationRecommendation,
	CalibrationReport,
	SkippedCell,
} from "../../domain/value-objects/calibration-report.js";
import type { RoutingDecision } from "../../domain/value-objects/routing-decision.js";
import type { RoutingOutcome } from "../../domain/value-objects/routing-outcome.js";
import { computeImplicitOutcomesUseCase } from "./compute-outcomes.js";

export interface CalibrateConfig {
	n_min: number;
	/** Preferred: explicit per-source weights. */
	source_weights?: Record<string, number>;
	/** Deprecated: single-dial debug-join weight. Used only if source_weights is absent. */
	implicit_weight?: number;
}

export interface CalibrateDeps {
	decisions: RoutingDecision[];
	implicitSource: OutcomeSource;
	outcomesSource: OutcomeSource;
	writer: OutcomeWriter;
	config: CalibrateConfig;
	now: () => string;
}

const DEFAULT_WEIGHTS: Record<string, number> = {
	manual: 1.0,
	"debug-join": 0.5,
	"model-judge": 1.0,
};

const resolveWeights = (config: CalibrateConfig): Record<string, number> => {
	if (config.source_weights) return config.source_weights;
	if (config.implicit_weight !== undefined) {
		return { manual: 1.0, "debug-join": config.implicit_weight, "model-judge": 1.0 };
	}
	return DEFAULT_WEIGHTS;
};

export const calibrateUseCase = async (deps: CalibrateDeps): Promise<CalibrationReport> => {
	await computeImplicitOutcomesUseCase({
		implicitSource: deps.implicitSource,
		existingOutcomesSource: deps.outcomesSource,
		writer: deps.writer,
	});

	const outcomes: RoutingOutcome[] = [];
	for await (const o of deps.outcomesSource.readOutcomes({})) outcomes.push(o);

	const weights = resolveWeights(deps.config);
	const implicitWeightDeprecated = deps.config.implicit_weight !== undefined;

	const { byAgent, byTag } = groupOutcomes({
		decisions: deps.decisions,
		outcomes,
		weights,
	});

	const cells: CalibrationCell[] = [];
	const skipped: SkippedCell[] = [];
	const recommendations: CalibrationRecommendation[] = [];

	const collectCells = (cellsByKey: Map<string, CalibrationCell>) => {
		for (const cell of cellsByKey.values()) {
			if (cell.effective_total < deps.config.n_min) {
				skipped.push({
					key: cell.key,
					total: cell.total,
					reason: `insufficient evidence (effective_N=${cell.effective_total}, need N_min=${deps.config.n_min})`,
				});
			} else {
				cells.push(cell);
				recommendations.push(...runAllRules(cell, { n_min: deps.config.n_min }));
			}
		}
	};

	collectCells(byAgent);
	collectCells(byTag);

	return {
		generated_at: deps.now(),
		n_min: deps.config.n_min,
		implicit_weight: weights["debug-join"] ?? 0.5,
		source_weights: weights,
		implicit_weight_deprecated: implicitWeightDeprecated,
		decisions_scanned: deps.decisions.length,
		outcomes_scanned: outcomes.length,
		cells,
		recommendations,
		skipped_cells: skipped,
	};
};
