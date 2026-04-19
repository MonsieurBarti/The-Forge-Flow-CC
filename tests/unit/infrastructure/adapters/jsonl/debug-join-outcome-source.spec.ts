import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RoutingOutcomeSchema } from "../../../../../src/domain/value-objects/routing-outcome.js";
import { DebugJoinOutcomeSource } from "../../../../../src/infrastructure/adapters/jsonl/debug-join-outcome-source.js";

const writeLine = async (path: string, obj: unknown) => {
	await appendFile(path, `${JSON.stringify(obj)}\n`, "utf8");
};

describe("DebugJoinOutcomeSource", () => {
	let dir: string;
	let routingPath: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "debug-join-"));
		routingPath = join(dir, "routing.jsonl");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("emits one outcome per decision_id when debug follows ship on same slice", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "tff-code-reviewer",
				confidence: 0.9,
				signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000001",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({})) collected.push(o);
		expect(collected).toHaveLength(1);
		expect(collected[0].dimension).toBe("unknown");
		expect(collected[0].verdict).toBe("wrong");
		expect(collected[0].source).toBe("debug-join");
		expect(collected[0].decision_id).toBe("00000000-0000-4000-8000-000000000001");
	});

	it("does not emit when debug precedes any ship on that slice", async () => {
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T08:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.5,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000002",
			},
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T10:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({})) collected.push(o);
		expect(collected).toEqual([]);
	});

	it("attributes debug to most recent prior ship (slice-bounded, next ship supersedes)", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "a",
				confidence: 0.9,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-0000000000a1",
			},
		});
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T11:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "b",
				confidence: 0.9,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-0000000000b1",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T12:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T13:00:00.000Z");
		const ids = [];
		for await (const o of src.readOutcomes({})) ids.push(o.decision_id);
		expect(ids).toEqual(["00000000-0000-4000-8000-0000000000b1"]);
	});

	it("is deterministic across identical inputs (idempotent outcome_ids)", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.5,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000001",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const run = async () => {
			const out = [];
			for await (const o of src.readOutcomes({})) out.push(o);
			return out;
		};
		const a = await run();
		const b = await run();
		expect(a.map((x) => x.outcome_id)).toEqual(b.map((x) => x.outcome_id));
	});

	it("filter by decision_id returns only matching outcome", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000011",
			},
		});
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "y",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000022",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({ decision_id: "00000000-0000-4000-8000-000000000011" }))
			collected.push(o);
		expect(collected).toHaveLength(1);
		expect(collected[0].decision_id).toBe("00000000-0000-4000-8000-000000000011");
	});

	it("filter source=manual short-circuits and yields nothing", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000033",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({ source: "manual" })) collected.push(o);
		expect(collected).toEqual([]);
	});

	it("filter source=debug-join passes through normally", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000044",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({ source: "debug-join" })) collected.push(o);
		expect(collected).toHaveLength(1);
		expect(collected[0].source).toBe("debug-join");
	});

	it("workflow_id is captured from the route event, not hardcoded", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "custom:workflow",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000055",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({})) collected.push(o);
		expect(collected).toHaveLength(1);
		expect(collected[0].workflow_id).toBe("custom:workflow");
	});

	it("outcome_id is a valid UUIDv5 (version nibble is 5)", async () => {
		await writeLine(routingPath, {
			kind: "route",
			timestamp: "2026-04-19T09:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				agent: "x",
				confidence: 0.8,
				signals: { complexity: "low", risk: { level: "low", tags: [] } },
				fallback_used: false,
				enriched: false,
				decision_id: "00000000-0000-4000-8000-000000000066",
			},
		});
		await writeLine(routingPath, {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		});

		const src = new DebugJoinOutcomeSource(routingPath, () => "2026-04-19T11:00:00.000Z");
		const collected = [];
		for await (const o of src.readOutcomes({})) collected.push(o);
		expect(collected).toHaveLength(1);
		const outcome = collected[0];
		const parseResult = RoutingOutcomeSchema.safeParse(outcome);
		expect(parseResult.success).toBe(true);
		// version nibble position 14 in "xxxxxxxx-xxxx-Vxxx-..." should be '5'
		expect(outcome.outcome_id.charAt(14)).toBe("5");
	});
});
