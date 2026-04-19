import { describe, expect, it, vi } from "vitest";
import { selectTierUseCase } from "../../../../src/application/routing/select-tier.js";
import type { DomainError } from "../../../../src/domain/errors/domain-error.js";
import type { RoutingDecisionLogger } from "../../../../src/domain/ports/routing-decision-logger.port.js";
import {
	DEFAULT_TIER_POLICY,
	type TierConfigReader,
} from "../../../../src/domain/ports/tier-config-reader.port.js";
import { Err, isOk, Ok } from "../../../../src/domain/result.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";
import type { ModelTier } from "../../../../src/domain/value-objects/tier-decision.js";

const LOW_SIGNALS: Signals = { complexity: "low", risk: { level: "low", tags: [] } };
const HIGH_SIGNALS: Signals = { complexity: "high", risk: { level: "high", tags: ["auth"] } };

const mkDeps = (minTier: ModelTier = "haiku") => {
	const tierConfigReader: TierConfigReader = {
		readTierPolicy: vi.fn().mockResolvedValue(Ok(DEFAULT_TIER_POLICY)),
		readAgentMinTier: vi.fn().mockResolvedValue(Ok(minTier)),
	};
	const logger: RoutingDecisionLogger = {
		append: vi.fn().mockResolvedValue(Ok(undefined)),
	};
	return { tierConfigReader, logger };
};

describe("selectTierUseCase", () => {
	it("returns haiku for low signals with haiku floor", async () => {
		const deps = mkDeps("haiku");
		const res = await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: LOW_SIGNALS,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.tier).toBe("haiku");
		expect(res.data.policy_tier).toBe("haiku");
		expect(res.data.min_tier_applied).toBe(false);
	});

	it("applies sonnet floor when policy says haiku", async () => {
		const deps = mkDeps("sonnet");
		const res = await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-security-auditor",
				signals: LOW_SIGNALS,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.tier).toBe("sonnet");
		expect(res.data.policy_tier).toBe("haiku");
		expect(res.data.min_tier_applied).toBe(true);
	});

	it("returns opus for high signals regardless of floor", async () => {
		const deps = mkDeps("haiku");
		const res = await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: HIGH_SIGNALS,
			},
			deps,
		);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.tier).toBe("opus");
		expect(res.data.min_tier_applied).toBe(false);
	});

	it("logs a tier entry with a UUID decision_id", async () => {
		const deps = mkDeps();
		await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: LOW_SIGNALS,
			},
			deps,
		);
		expect(deps.logger.append).toHaveBeenCalledOnce();
		const entry = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(entry.kind).toBe("tier");
		expect(entry.decision.decision_id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("propagates signals unchanged through to the log entry", async () => {
		const deps = mkDeps();
		await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: HIGH_SIGNALS,
			},
			deps,
		);
		const entry = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(entry.decision.signals).toEqual(HIGH_SIGNALS);
	});

	it("propagates readTierPolicy error", async () => {
		const deps = mkDeps();
		const error: DomainError = { code: "ROUTING_CONFIG", message: "boom" };
		(deps.tierConfigReader.readTierPolicy as ReturnType<typeof vi.fn>).mockResolvedValue(
			Err(error),
		);
		const res = await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: LOW_SIGNALS,
			},
			deps,
		);
		expect(isOk(res)).toBe(false);
	});

	it("propagates readAgentMinTier error", async () => {
		const deps = mkDeps();
		const error: DomainError = { code: "ROUTING_CONFIG", message: "boom" };
		(deps.tierConfigReader.readAgentMinTier as ReturnType<typeof vi.fn>).mockResolvedValue(
			Err(error),
		);
		const res = await selectTierUseCase(
			{
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				agent_id: "tff-code-reviewer",
				signals: LOW_SIGNALS,
			},
			deps,
		);
		expect(isOk(res)).toBe(false);
	});
});
