import { describe, expect, it } from "vitest";
import { buildMilestoneScorecard } from "../../../src/application/routing/build-milestone-scorecard.js";
import type {
	OutcomeReadFilter,
	OutcomeSource,
} from "../../../src/domain/ports/outcome-source.port.js";
import type { RoutingOutcome } from "../../../src/domain/value-objects/routing-outcome.js";

const fakeSource = (outcomes: RoutingOutcome[]): OutcomeSource => ({
	async *readOutcomes(filter: OutcomeReadFilter) {
		for (const o of outcomes) {
			if (filter.source && o.source !== filter.source) continue;
			yield o;
		}
	},
});

const out = (overrides: Partial<RoutingOutcome>): RoutingOutcome =>
	({
		outcome_id: "00000000-0000-4000-8000-000000000000",
		decision_id: "00000000-0000-4000-8000-000000000001",
		dimension: "agent",
		verdict: "ok",
		source: "model-judge",
		slice_id: "M01-S01",
		workflow_id: "tff:ship",
		emitted_at: "2026-04-25T00:00:00.000Z",
		...overrides,
	}) as RoutingOutcome;

describe("buildMilestoneScorecard", () => {
	it("returns vacuous scorecard when no outcomes", async () => {
		const scorecard = await buildMilestoneScorecard({
			milestoneId: "m-uuid",
			milestoneLabel: "M01",
			sliceLabels: ["M01-S01"],
			outcomeSource: fakeSource([]),
			now: () => "2026-04-25T00:00:00.000Z",
		});
		expect(scorecard.decision_count).toBe(0);
		expect(scorecard.agreement_rate).toBe(1);
		expect(scorecard.by_dimension.agent).toEqual({ ok: 0, wrong: 0 });
	});

	it("counts agent verdicts (ok, wrong)", async () => {
		const scorecard = await buildMilestoneScorecard({
			milestoneId: "m",
			milestoneLabel: "M01",
			sliceLabels: ["M01-S01"],
			outcomeSource: fakeSource([
				out({ dimension: "agent", verdict: "ok" }),
				out({ dimension: "agent", verdict: "ok" }),
				out({ dimension: "agent", verdict: "wrong" }),
			]),
			now: () => "n",
		});
		expect(scorecard.decision_count).toBe(3);
		expect(scorecard.by_dimension.agent).toEqual({ ok: 2, wrong: 1 });
		expect(scorecard.agreement_rate).toBeCloseTo(2 / 3);
	});

	it("counts tier verdicts (ok, wrong, too-low, too-high)", async () => {
		const scorecard = await buildMilestoneScorecard({
			milestoneId: "m",
			milestoneLabel: "M01",
			sliceLabels: ["M01-S01"],
			outcomeSource: fakeSource([
				out({ dimension: "tier", verdict: "ok" }),
				out({ dimension: "tier", verdict: "too-low" }),
				out({ dimension: "tier", verdict: "too-high" }),
				out({ dimension: "tier", verdict: "wrong" }),
			]),
			now: () => "n",
		});
		expect(scorecard.by_dimension.tier).toEqual({
			ok: 1,
			wrong: 1,
			"too-low": 1,
			"too-high": 1,
		});
		expect(scorecard.agreement_rate).toBeCloseTo(1 / 4);
	});

	it("excludes outcomes from slices outside the milestone", async () => {
		const scorecard = await buildMilestoneScorecard({
			milestoneId: "m",
			milestoneLabel: "M01",
			sliceLabels: ["M01-S01"],
			outcomeSource: fakeSource([
				out({ slice_id: "M01-S01", dimension: "agent", verdict: "ok" }),
				out({ slice_id: "M02-S01", dimension: "agent", verdict: "wrong" }),
			]),
			now: () => "n",
		});
		expect(scorecard.decision_count).toBe(1);
		expect(scorecard.by_dimension.agent).toEqual({ ok: 1, wrong: 0 });
	});
});
