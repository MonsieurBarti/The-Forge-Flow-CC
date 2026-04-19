import { describe, expect, it } from "vitest";
import { computeImplicitOutcomesUseCase } from "../../../../src/application/routing/compute-outcomes.js";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const outcome = (decision_id: string, outcome_id: string): RoutingOutcome => ({
	outcome_id,
	decision_id,
	dimension: "unknown",
	verdict: "wrong",
	source: "debug-join",
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T10:00:00.000Z",
});

const arraySource = (items: RoutingOutcome[]): OutcomeSource => ({
	readOutcomes: async function* () {
		for (const o of items) yield o;
	},
});

describe("computeImplicitOutcomesUseCase", () => {
	it("writes all new outcomes when no prior debug-join outcomes exist", async () => {
		const written: RoutingOutcome[] = [];
		const writer: OutcomeWriter = { append: async (o) => void written.push(o) };
		const res = await computeImplicitOutcomesUseCase({
			implicitSource: arraySource([
				outcome("00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-0000000000a1"),
				outcome("00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-0000000000a2"),
			]),
			existingOutcomesSource: arraySource([]),
			writer,
		});
		expect(res.written).toBe(2);
		expect(written).toHaveLength(2);
	});

	it("skips outcomes whose (decision_id, source=debug-join) already exist", async () => {
		const existing = outcome(
			"00000000-0000-4000-8000-000000000001",
			"00000000-0000-4000-8000-0000000000a1",
		);
		const written: RoutingOutcome[] = [];
		const writer: OutcomeWriter = { append: async (o) => void written.push(o) };
		const res = await computeImplicitOutcomesUseCase({
			implicitSource: arraySource([
				existing,
				outcome("00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-0000000000a2"),
			]),
			existingOutcomesSource: arraySource([existing]),
			writer,
		});
		expect(res.written).toBe(1);
		expect(written).toHaveLength(1);
		expect(written[0].decision_id).toBe("00000000-0000-4000-8000-000000000002");
	});

	it("is idempotent across two runs", async () => {
		const items = [
			outcome("00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-0000000000a1"),
		];
		const accumulated: RoutingOutcome[] = [];
		const writer: OutcomeWriter = { append: async (o) => void accumulated.push(o) };

		await computeImplicitOutcomesUseCase({
			implicitSource: arraySource(items),
			existingOutcomesSource: arraySource([]),
			writer,
		});
		await computeImplicitOutcomesUseCase({
			implicitSource: arraySource(items),
			existingOutcomesSource: arraySource(accumulated),
			writer,
		});

		expect(accumulated).toHaveLength(1);
	});
});
