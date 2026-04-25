import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";

export interface MilestoneScorecardSliceLabel {
	sliceLabel: string;
}

export interface MilestoneScorecardCounts {
	ok: number;
	wrong: number;
	"too-low": number;
	"too-high": number;
}

export interface MilestoneScorecard {
	milestone_id: string;
	milestone_label: string;
	slice_count: number;
	slice_labels: string[];
	decision_count: number;
	by_dimension: {
		agent: { ok: number; wrong: number };
		tier: MilestoneScorecardCounts;
	};
	agreement_rate: number; // ok / decision_count, or 1 when decision_count=0
	generated_at: string;
}

/**
 * Aggregate model-judge outcomes for a milestone's slices into a routing
 * scorecard. Reads outcomes from the outcomes source and counts verdicts by
 * dimension. `agreement_rate` is `ok / total`; when there are no judged
 * decisions the rate defaults to 1 (vacuously fine).
 */
export const buildMilestoneScorecard = async (input: {
	milestoneId: string;
	milestoneLabel: string;
	sliceLabels: string[];
	outcomeSource: OutcomeSource;
	now: () => string;
}): Promise<MilestoneScorecard> => {
	const sliceSet = new Set(input.sliceLabels);
	const counts = {
		agent: { ok: 0, wrong: 0 },
		tier: { ok: 0, wrong: 0, "too-low": 0, "too-high": 0 } as MilestoneScorecardCounts,
	};

	let total = 0;
	let okCount = 0;

	for await (const outcome of input.outcomeSource.readOutcomes({ source: "model-judge" })) {
		if (!sliceSet.has(outcome.slice_id)) continue;
		total++;
		if (outcome.verdict === "ok") okCount++;
		if (outcome.dimension === "agent") {
			if (outcome.verdict === "ok") counts.agent.ok++;
			else if (outcome.verdict === "wrong") counts.agent.wrong++;
		} else if (outcome.dimension === "tier") {
			counts.tier[outcome.verdict] += 1;
		}
	}

	return {
		milestone_id: input.milestoneId,
		milestone_label: input.milestoneLabel,
		slice_count: input.sliceLabels.length,
		slice_labels: [...input.sliceLabels],
		decision_count: total,
		by_dimension: counts,
		agreement_rate: total === 0 ? 1 : okCount / total,
		generated_at: input.now(),
	};
};
