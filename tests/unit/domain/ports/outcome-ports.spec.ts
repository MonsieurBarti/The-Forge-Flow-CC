import { describe, expect, it } from "vitest";
import type { OutcomeSource } from "../../../../src/domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

describe("OutcomeSource port", () => {
	it("is satisfied by a trivial in-memory implementation", async () => {
		const impl: OutcomeSource = {
			async *readOutcomes() {
				// empty stream
			},
		};
		const collected: RoutingOutcome[] = [];
		for await (const o of impl.readOutcomes({})) collected.push(o);
		expect(collected).toEqual([]);
	});
});

describe("OutcomeWriter port", () => {
	it("is satisfied by a trivial in-memory implementation", async () => {
		const written: RoutingOutcome[] = [];
		const impl: OutcomeWriter = {
			async append(o) {
				written.push(o);
			},
		};
		const o = {
			outcome_id: "00000000-0000-4000-8000-000000000001",
			decision_id: "00000000-0000-4000-8000-000000000002",
			dimension: "tier",
			verdict: "too-low",
			source: "manual",
			slice_id: "M01-S01",
			workflow_id: "tff:ship",
			emitted_at: "2026-04-19T10:00:00.000Z",
		} as const;
		await impl.append(o);
		expect(written).toHaveLength(1);
	});
});
