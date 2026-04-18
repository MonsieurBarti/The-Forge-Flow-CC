import { describe, expect, it, vi } from "vitest";
import { routeUseCase } from "../../../../src/application/routing/route.js";
import { createDomainError } from "../../../../src/domain/errors/domain-error.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../../../src/domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../../../src/domain/ports/routing-decision-logger.port.js";
import { Err, Ok, isOk } from "../../../../src/domain/result.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";
import type { WorkflowPool } from "../../../../src/domain/value-objects/workflow-pool.js";

const POOL: WorkflowPool = {
	workflow_id: "tff:ship",
	agents: [
		{
			id: "tff-security-auditor",
			handles: ["high_risk", "auth", "migrations"],
			priority: 20,
		},
		{ id: "tff-code-reviewer", handles: ["standard_review"], priority: 10 },
	],
	default_agent: "tff-code-reviewer",
};

const HIGH_CONF_SIGNALS: Signals = {
	complexity: "high",
	risk: { level: "high", tags: ["auth", "migrations"] },
};
const LOW_CONF_SIGNALS: Signals = {
	complexity: "low",
	risk: { level: "low", tags: [] },
};

const CONFIG: RoutingConfig = {
	enabled: true,
	llm_enrichment: {
		enabled: true,
		model: "claude-haiku-4-5-20251001",
		timeout_ms: 5000,
	},
	confidence_threshold: 0.5,
	logging: { path: ".tff-cc/logs/routing.jsonl" },
};

const mkDeps = () => {
	const configReader: RoutingConfigReader = {
		readConfig: vi.fn().mockResolvedValue(Ok(CONFIG)),
		readPool: vi.fn().mockResolvedValue(Ok(POOL)),
	};
	const logger: RoutingDecisionLogger = {
		append: vi.fn().mockResolvedValue(Ok(undefined)),
	};
	return { configReader, logger };
};

describe("routeUseCase", () => {
	it("returns top-scored agent when confidence exceeds threshold", async () => {
		const deps = mkDeps();
		const res = await routeUseCase(
			{ workflow_id: "tff:ship", signals: HIGH_CONF_SIGNALS, slice_id: "S1" },
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.agent).toBe("tff-security-auditor");
		expect(res.data.confidence).toBeCloseTo(1);
		expect(res.data.fallback_used).toBe(false);
	});

	it("falls back to pool.default_agent when top confidence is below threshold", async () => {
		const deps = mkDeps();
		const res = await routeUseCase(
			{ workflow_id: "tff:ship", signals: LOW_CONF_SIGNALS, slice_id: "S1" },
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.agent).toBe("tff-code-reviewer"); // pool default
		expect(res.data.fallback_used).toBe(true);
	});

	it("fails when pool lookup errors", async () => {
		const deps = mkDeps();
		deps.configReader.readPool = vi
			.fn()
			.mockResolvedValue(
				Err(
					createDomainError(
						"ROUTING_CONFIG",
						"pool missing",
						{ workflow_id: "tff:ship" },
					),
				),
			);
		const res = await routeUseCase(
			{ workflow_id: "tff:ship", signals: HIGH_CONF_SIGNALS, slice_id: "S1" },
			deps,
		);
		expect(isOk(res)).toBe(false);
	});

	it("writes a route log entry per call", async () => {
		const deps = mkDeps();
		await routeUseCase(
			{ workflow_id: "tff:ship", signals: HIGH_CONF_SIGNALS, slice_id: "S1" },
			deps,
		);
		expect(deps.logger.append).toHaveBeenCalledTimes(1);
		const entry = (deps.logger.append as ReturnType<typeof vi.fn>).mock
			.calls[0]?.[0];
		expect(entry.kind).toBe("route");
	});
});
