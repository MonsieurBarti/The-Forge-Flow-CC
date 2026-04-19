import type {
	CalibrationCell,
	CellKey,
	VerdictBreakdown,
} from "../value-objects/calibration-report.js";
import type { RoutingDecision } from "../value-objects/routing-decision.js";
import type { OutcomeSourceKind, RoutingOutcome } from "../value-objects/routing-outcome.js";

export type GroupWeights = Record<OutcomeSourceKind, number>;

export interface GroupOutcomesInput {
	decisions: RoutingDecision[];
	outcomes: RoutingOutcome[];
	weights: GroupWeights;
}

export interface GroupOutcomesResult {
	byAgent: Map<string, CalibrationCell>;
	byTag: Map<string, CalibrationCell>;
}

const EMPTY_BREAKDOWN = (): VerdictBreakdown => ({ ok: 0, wrong: 0, too_low: 0, too_high: 0 });

const MAX_SAMPLES = 10;

const verdictKey = (v: RoutingOutcome["verdict"]): keyof VerdictBreakdown => {
	if (v === "too-low") return "too_low";
	if (v === "too-high") return "too_high";
	return v;
};

const addToCell = (
	cell: CalibrationCell,
	outcome: RoutingOutcome,
	weight: number,
): CalibrationCell => {
	const verdict_breakdown = { ...cell.verdict_breakdown };
	verdict_breakdown[verdictKey(outcome.verdict)] += 1;
	const effective_wrong = cell.effective_wrong + (outcome.verdict === "ok" ? 0 : weight);
	const sample_decision_ids =
		cell.sample_decision_ids.length < MAX_SAMPLES &&
		!cell.sample_decision_ids.includes(outcome.decision_id)
			? [...cell.sample_decision_ids, outcome.decision_id]
			: cell.sample_decision_ids;
	return {
		...cell,
		total: cell.total + 1,
		effective_total: cell.effective_total + weight,
		effective_wrong,
		verdict_breakdown,
		sample_decision_ids,
	};
};

const emptyCell = (key: CellKey): CalibrationCell => ({
	key,
	total: 0,
	effective_total: 0,
	effective_wrong: 0,
	verdict_breakdown: EMPTY_BREAKDOWN(),
	sample_decision_ids: [],
});

const weightFor = (source: OutcomeSourceKind, weights: GroupWeights): number =>
	source === "manual" ? weights.manual : weights["debug-join"];

export const groupOutcomes = (input: GroupOutcomesInput): GroupOutcomesResult => {
	const byAgent = new Map<string, CalibrationCell>();
	const byTag = new Map<string, CalibrationCell>();
	const decisionById = new Map(input.decisions.map((d) => [d.decision_id, d]));

	for (const outcome of input.outcomes) {
		const decision = decisionById.get(outcome.decision_id);
		if (!decision) continue;
		const weight = weightFor(outcome.source, input.weights);

		const agentKey = decision.agent;
		const currentAgent = byAgent.get(agentKey) ?? emptyCell({ kind: "agent", value: agentKey });
		byAgent.set(agentKey, addToCell(currentAgent, outcome, weight));

		for (const tag of decision.signals.risk.tags) {
			const currentTag = byTag.get(tag) ?? emptyCell({ kind: "tag", value: tag });
			byTag.set(tag, addToCell(currentTag, outcome, weight));
		}
	}

	return { byAgent, byTag };
};
