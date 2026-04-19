import { describe, expect, it } from "vitest";
import { recordOutcomeUseCase } from "../../../../src/application/routing/record-outcome.js";
import type { OutcomeWriter } from "../../../../src/domain/ports/outcome-writer.port.js";
import { isErr, isOk } from "../../../../src/domain/result.js";
import type { RoutingOutcome } from "../../../../src/domain/value-objects/routing-outcome.js";

const makeWriter = () => {
	const written: RoutingOutcome[] = [];
	const writer: OutcomeWriter = { append: async (o) => void written.push(o) };
	return { writer, written };
};

const validDecisionId = "00000000-0000-4000-8000-000000000001";

const decisions = [
	{
		decision_id: validDecisionId,
		slice_id: "M01-S01",
		workflow_id: "tff:ship",
	},
];

describe("recordOutcomeUseCase", () => {
	it("writes a validated outcome and returns {ok:true,data:{outcome_id}}", async () => {
		const { writer, written } = makeWriter();
		const res = await recordOutcomeUseCase(
			{
				decision_id: validDecisionId,
				dimension: "tier",
				verdict: "too-low",
				reason: "needed Opus",
			},
			{
				writer,
				knownDecisions: decisions,
				uuid: () => "00000000-0000-4000-8000-000000000aaa",
				now: () => "2026-04-19T10:00:00.000Z",
			},
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.outcome_id).toBe("00000000-0000-4000-8000-000000000aaa");
		expect(written).toHaveLength(1);
		expect(written[0].source).toBe("manual");
		expect(written[0].slice_id).toBe("M01-S01");
	});

	it("rejects unknown decision_id with PRECONDITION_VIOLATION", async () => {
		const { writer } = makeWriter();
		const res = await recordOutcomeUseCase(
			{
				decision_id: "00000000-0000-4000-8000-0000000000ff",
				dimension: "agent",
				verdict: "wrong",
			},
			{
				writer,
				knownDecisions: decisions,
				uuid: () => "00000000-0000-4000-8000-000000000aaa",
				now: () => "2026-04-19T10:00:00.000Z",
			},
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("rejects invalid dimension × verdict combo with PRECONDITION_VIOLATION", async () => {
		const { writer } = makeWriter();
		const res = await recordOutcomeUseCase(
			{ decision_id: validDecisionId, dimension: "agent", verdict: "too-low" },
			{
				writer,
				knownDecisions: decisions,
				uuid: () => "00000000-0000-4000-8000-000000000aaa",
				now: () => "2026-04-19T10:00:00.000Z",
			},
		);
		expect(isErr(res)).toBe(true);
		if (!isErr(res)) throw new Error("not err");
		expect(res.error.code).toBe("PRECONDITION_VIOLATION");
	});
});
