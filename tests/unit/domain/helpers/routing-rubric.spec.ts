import { describe, expect, it } from "vitest";
import {
	scoreAgents,
	signalsToTagSet,
} from "../../../../src/domain/helpers/routing-rubric.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";
import type { WorkflowPool } from "../../../../src/domain/value-objects/workflow-pool.js";

const signals = (overrides: Partial<Signals> = {}): Signals => ({
	complexity: "medium",
	risk: { level: "medium", tags: [] },
	...overrides,
});

describe("signalsToTagSet", () => {
	it("produces canonical complexity + risk_level tags plus risk.tags", () => {
		const tags = signalsToTagSet(
			signals({
				complexity: "high",
				risk: { level: "high", tags: ["auth", "migrations"] },
			}),
		);
		expect(tags).toEqual(
			new Set(["high_complexity", "high_risk", "auth", "migrations"]),
		);
	});
});

describe("scoreAgents", () => {
	const pool: WorkflowPool = {
		workflow_id: "tff:ship",
		agents: [
			{
				id: "tff-security-auditor",
				handles: ["high_complexity", "high_risk", "auth", "migrations"],
				priority: 20,
			},
			{
				id: "tff-code-reviewer",
				handles: ["standard_review"],
				priority: 10,
			},
			{ id: "tff-fixer", handles: [], priority: 0 },
		],
		default_agent: "tff-code-reviewer",
	};

	it("returns match_ratio = 1 when agent covers every signal tag", () => {
		const s = signals({
			complexity: "high",
			risk: { level: "high", tags: ["auth", "migrations"] },
		});
		const ranked = scoreAgents(pool, s);
		const top = ranked[0];
		expect(top?.agent.id).toBe("tff-security-auditor");
		expect(top?.match_ratio).toBeCloseTo(1);
	});

	it("returns match_ratio = 0 for an agent with empty handles", () => {
		const ranked = scoreAgents(pool, signals());
		const fixer = ranked.find((r) => r.agent.id === "tff-fixer");
		expect(fixer?.match_ratio).toBe(0);
	});

	it("returns fractional match_ratio for partial coverage", () => {
		const s = signals({
			complexity: "low",
			risk: { level: "high", tags: ["auth"] },
		});
		const ranked = scoreAgents(pool, s);
		const secAuditor = ranked.find(
			(r) => r.agent.id === "tff-security-auditor",
		);
		// signals tags = {low_complexity, high_risk, auth} → |3|
		// handles ∩ signals = {high_risk, auth} → |2|
		// match_ratio = 2/3
		expect(secAuditor?.match_ratio).toBeCloseTo(2 / 3);
	});

	it("REGRESSION: specialist with multiple matching handles beats a narrow single-handle agent", () => {
		const narrowPool: WorkflowPool = {
			workflow_id: "tff:ship",
			agents: [
				{
					id: "tff-security-auditor",
					handles: ["high_risk", "auth", "migrations"],
					priority: 5,
				},
				{
					id: "narrow-agent",
					handles: ["high_risk"],
					priority: 10,
				},
			],
			default_agent: "narrow-agent",
		};
		const s = signals({
			complexity: "low",
			risk: { level: "high", tags: ["auth", "migrations"] },
		});
		const ranked = scoreAgents(narrowPool, s);
		expect(ranked[0]?.agent.id).toBe("tff-security-auditor");
		expect(ranked[0]?.match_ratio).toBeCloseTo(0.75);
		expect(ranked[1]?.match_ratio).toBeCloseTo(0.25);
	});

	it("breaks ties using priority (higher wins)", () => {
		const tiePool: WorkflowPool = {
			workflow_id: "tff:ship",
			agents: [
				{ id: "low-prio", handles: ["high_risk"], priority: 1 },
				{ id: "high-prio", handles: ["high_risk"], priority: 100 },
			],
			default_agent: "low-prio",
		};
		const s = signals({
			complexity: "low",
			risk: { level: "high", tags: [] },
		});
		const ranked = scoreAgents(tiePool, s);
		expect(ranked[0]?.agent.id).toBe("high-prio");
	});

	it("Signals additive-extensibility canary: unknown field does not break projection", () => {
		const futureSignals = {
			complexity: "low",
			risk: { level: "low", tags: [] },
			tier_hint: "haiku",
		} as unknown as Signals;
		expect(() => signalsToTagSet(futureSignals)).not.toThrow();
	});
});
