import { describe, expect, it, vi } from "vitest";
import { decideUseCase } from "../../../../src/application/routing/decide.js";
import { createDomainError } from "../../../../src/domain/errors/domain-error.js";
import type { LlmEnricher } from "../../../../src/domain/ports/llm-enricher.port.js";
import type {
  RoutingConfig,
  RoutingConfigReader,
} from "../../../../src/domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../../../src/domain/ports/routing-decision-logger.port.js";
import type { SignalExtractor } from "../../../../src/domain/ports/signal-extractor.port.js";
import {
  DEFAULT_TIER_POLICY,
  type TierConfigReader,
} from "../../../../src/domain/ports/tier-config-reader.port.js";
import { Err, isOk, Ok } from "../../../../src/domain/result.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";
import type { WorkflowPool } from "../../../../src/domain/value-objects/workflow-pool.js";

const POOL: WorkflowPool = {
  workflow_id: "tff:ship",
  agents: [
    { id: "tff-spec-reviewer", handles: ["standard_review"], priority: 10 },
    { id: "tff-code-reviewer", handles: ["standard_review", "code_quality"], priority: 10 },
    { id: "tff-security-auditor", handles: ["high_risk", "auth"], priority: 20 },
  ],
  default_agent: "tff-spec-reviewer",
};

const SIGNALS: Signals = {
  complexity: "medium",
  risk: { level: "low", tags: ["tests"] },
};

const CONFIG: RoutingConfig = {
  enabled: true,
  llm_enrichment: { enabled: false, model: "claude-haiku-4-5-20251001", timeout_ms: 5000 },
  confidence_threshold: 0.5,
  logging: { path: ".tff-cc/logs/routing.jsonl" },
};

const mkDeps = () => {
  const configReader: RoutingConfigReader = {
    readConfig: vi.fn().mockResolvedValue(Ok(CONFIG)),
    readPool: vi.fn().mockResolvedValue(Ok(POOL)),
  };
  const tierConfigReader: TierConfigReader = {
    readTierPolicy: vi.fn().mockResolvedValue(Ok(DEFAULT_TIER_POLICY)),
    readAgentMinTier: vi.fn().mockResolvedValue(Ok("haiku")),
  };
  const extractor: SignalExtractor = {
    extract: vi.fn().mockResolvedValue(Ok(SIGNALS)),
  };
  const enricher: LlmEnricher = {
    enrich: vi.fn(),
  };
  const logger: RoutingDecisionLogger = {
    append: vi.fn().mockResolvedValue(Ok(undefined)),
  };
  return { configReader, tierConfigReader, extractor, enricher, logger };
};

describe("decideUseCase", () => {
  it("returns one decision per pool agent in declared order", async () => {
    const deps = mkDeps();
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "M01-S01",
        extract_input: { slice_id: "M01-S01", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;
    expect(res.data.decisions.map((d) => d.agent)).toEqual([
      "tff-spec-reviewer",
      "tff-code-reviewer",
      "tff-security-auditor",
    ]);
  });

  it("each decision carries tier_decision_id, route_decision_id, and tier", async () => {
    const deps = mkDeps();
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;
    for (const d of res.data.decisions) {
      expect(d.tier).toMatch(/^(haiku|sonnet|opus)$/);
      expect(d.route_decision_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(d.tier_decision_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(d.route_decision_id).not.toBe(d.tier_decision_id);
    }
  });

  it("emits extract + route×N + tier×N log events in order", async () => {
    const deps = mkDeps();
    await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    const calls = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { kind: string }).kind,
    );
    expect(calls).toEqual(["extract", "route", "tier", "route", "tier", "route", "tier"]);
  });

  it("propagates extract failure and does not call route/tier", async () => {
    const deps = mkDeps();
    deps.extractor.extract = vi
      .fn()
      .mockResolvedValue(Err(createDomainError("SIGNAL_EXTRACTION", "boom", {})));
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(false);
    const kinds = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { kind: string }).kind,
    );
    expect(kinds).not.toContain("route");
    expect(kinds).not.toContain("tier");
  });

  it("propagates readPool failure", async () => {
    const deps = mkDeps();
    deps.configReader.readPool = vi
      .fn()
      .mockResolvedValue(Err(createDomainError("ROUTING_CONFIG", "nope", {})));
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(false);
  });

  it("handles a single-agent pool", async () => {
    const deps = mkDeps();
    deps.configReader.readPool = vi.fn().mockResolvedValue(
      Ok({
        workflow_id: "tff:ship",
        agents: [{ id: "tff-code-reviewer", handles: ["standard_review"], priority: 10 }],
        default_agent: "tff-code-reviewer",
      }),
    );
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;
    expect(res.data.decisions).toHaveLength(1);
    expect(res.data.decisions[0].agent).toBe("tff-code-reviewer");
  });

  it("surfaces tier failure mid-loop", async () => {
    const deps = mkDeps();
    let calls = 0;
    deps.tierConfigReader.readAgentMinTier = vi.fn().mockImplementation(() => {
      calls++;
      if (calls === 2)
        return Promise.resolve(Err(createDomainError("ROUTING_CONFIG", "boom", {})));
      return Promise.resolve(Ok("haiku"));
    });
    const res = await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    expect(isOk(res)).toBe(false);
  });

  it("passes enriched flag through to each route decision log", async () => {
    const deps = mkDeps();
    const enriched: Signals = {
      complexity: "high",
      risk: { level: "high", tags: ["auth"] },
    };
    deps.configReader.readConfig = vi
      .fn()
      .mockResolvedValue(
        Ok({ ...CONFIG, llm_enrichment: { ...CONFIG.llm_enrichment, enabled: true } }),
      );
    deps.extractor.extract = vi
      .fn()
      .mockResolvedValue(Ok({ complexity: "low", risk: { level: "low", tags: [] } }));
    deps.enricher.enrich = vi.fn().mockResolvedValue(Ok(enriched));

    await decideUseCase(
      {
        workflow_id: "tff:ship",
        slice_id: "S",
        extract_input: { slice_id: "S", description: "x", affected_files: [] },
      },
      deps,
    );
    const routeCalls = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => c[0] as { kind: string; decision?: { enriched?: boolean } })
      .filter((e) => e.kind === "route");
    expect(routeCalls.length).toBeGreaterThan(0);
    for (const c of routeCalls) expect(c.decision?.enriched).toBe(true);
  });
});
